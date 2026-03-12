// Script completo de testes - Verifica variáveis, conexões e login
// Execute: npx tsx --require dotenv/config scripts/test-all.ts

import { PrismaClient as PostgresPrismaClient } from '../.prisma/postgres-client';
import { connectToDatabase } from '../lib/mongodb-native';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PostgresPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

interface TestResult {
  name: string;
  status: '✅ PASSOU' | '❌ FALHOU';
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, status: '✅ PASSOU' | '❌ FALHOU', message: string) {
  results.push({ name, status, message });
  console.log(`${status} ${name}: ${message}`);
}

async function testEnvironmentVariables() {
  console.log('\n📋 TESTE 1: Variáveis de Ambiente\n');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'MONGODB_URI',
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      // Mascarar valores sensíveis
      const masked = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')
        ? value.substring(0, 10) + '...'
        : value;
      addResult(`Variável ${varName}`, '✅ PASSOU', `Configurada: ${masked}`);
    } else {
      addResult(`Variável ${varName}`, '❌ FALHOU', 'NÃO CONFIGURADA');
    }
  }

  // Verificar NEXTAUTH_URL específico
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    if (nextAuthUrl.includes('localhost')) {
      addResult('NEXTAUTH_URL (produção)', '❌ FALHOU', 'Está usando localhost - deve ser URL de produção');
    } else if (nextAuthUrl.startsWith('https://')) {
      addResult('NEXTAUTH_URL (formato)', '✅ PASSOU', 'Formato correto (https://)');
    } else {
      addResult('NEXTAUTH_URL (formato)', '❌ FALHOU', 'Deve começar com https://');
    }
  }
}

async function testSupabaseConnection() {
  console.log('\n🗄️  TESTE 2: Conexão Supabase (PostgreSQL)\n');
  
  try {
    await prisma.$connect();
    addResult('Conexão Supabase', '✅ PASSOU', 'Conectado com sucesso');
    
    // Testar query simples
    const userCount = await prisma.user.count();
    addResult('Query Supabase', '✅ PASSOU', `Total de usuários: ${userCount}`);
    
    // Verificar se usuários existem
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@macofel.com' },
    });
    
    if (admin) {
      addResult('Usuário Admin', '✅ PASSOU', 'admin@macofel.com existe');
    } else {
      addResult('Usuário Admin', '❌ FALHOU', 'admin@macofel.com NÃO existe');
    }
    
    const client = await prisma.user.findUnique({
      where: { email: 'cliente@teste.com' },
    });
    
    if (client) {
      addResult('Usuário Cliente', '✅ PASSOU', 'cliente@teste.com existe');
    } else {
      addResult('Usuário Cliente', '❌ FALHOU', 'cliente@teste.com NÃO existe');
    }
    
  } catch (error: any) {
    addResult('Conexão Supabase', '❌ FALHOU', `Erro: ${error.message}`);
  }
}

async function testMongoDBConnection() {
  console.log('\n🍃 TESTE 3: Conexão MongoDB\n');
  
  try {
    const db = await connectToDatabase();
    addResult('Conexão MongoDB', '✅ PASSOU', 'Conectado com sucesso');
    
    // Testar query simples
    const productsCollection = db.collection('products');
    const productCount = await productsCollection.countDocuments();
    addResult('Query MongoDB', '✅ PASSOU', `Total de produtos: ${productCount}`);
    
    const categoriesCollection = db.collection('categories');
    const categoryCount = await categoriesCollection.countDocuments();
    addResult('Categorias MongoDB', '✅ PASSOU', `Total de categorias: ${categoryCount}`);
    
  } catch (error: any) {
    addResult('Conexão MongoDB', '❌ FALHOU', `Erro: ${error.message}`);
  }
}

async function testLoginCredentials() {
  console.log('\n🔐 TESTE 4: Credenciais de Login\n');
  
  try {
    // Testar admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@macofel.com' },
    });
    
    if (admin) {
      const isCorrectPassword = await bcrypt.compare('admin123', admin.password);
      if (isCorrectPassword) {
        addResult('Senha Admin', '✅ PASSOU', 'admin123 está correta');
      } else {
        addResult('Senha Admin', '❌ FALHOU', 'admin123 está INCORRETA');
      }
    } else {
      addResult('Senha Admin', '❌ FALHOU', 'Usuário admin não existe');
    }
    
    // Testar cliente
    const client = await prisma.user.findUnique({
      where: { email: 'cliente@teste.com' },
    });
    
    if (client) {
      const isCorrectPassword = await bcrypt.compare('cliente123', client.password);
      if (isCorrectPassword) {
        addResult('Senha Cliente', '✅ PASSOU', 'cliente123 está correta');
      } else {
        addResult('Senha Cliente', '❌ FALHOU', 'cliente123 está INCORRETA');
      }
    } else {
      addResult('Senha Cliente', '❌ FALHOU', 'Usuário cliente não existe');
    }
    
  } catch (error: any) {
    addResult('Teste Credenciais', '❌ FALHOU', `Erro: ${error.message}`);
  }
}

async function testNextAuthConfig() {
  console.log('\n🔑 TESTE 5: Configuração NextAuth\n');
  
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  if (nextAuthSecret) {
    if (nextAuthSecret.length >= 32) {
      addResult('NEXTAUTH_SECRET (tamanho)', '✅ PASSOU', `Tamanho adequado (${nextAuthSecret.length} caracteres)`);
    } else {
      addResult('NEXTAUTH_SECRET (tamanho)', '❌ FALHOU', `Muito curto (${nextAuthSecret.length} caracteres - mínimo 32)`);
    }
  } else {
    addResult('NEXTAUTH_SECRET', '❌ FALHOU', 'NÃO CONFIGURADO');
  }
  
  if (nextAuthUrl) {
    if (nextAuthUrl.startsWith('https://')) {
      addResult('NEXTAUTH_URL (produção)', '✅ PASSOU', `URL de produção: ${nextAuthUrl}`);
    } else {
      addResult('NEXTAUTH_URL (produção)', '❌ FALHOU', `URL incorreta: ${nextAuthUrl}`);
    }
  } else {
    addResult('NEXTAUTH_URL', '❌ FALHOU', 'NÃO CONFIGURADO');
  }
}

async function main() {
  console.log('🧪 INICIANDO TESTES COMPLETOS\n');
  console.log('=' .repeat(60));
  
  await testEnvironmentVariables();
  await testSupabaseConnection();
  await testMongoDBConnection();
  await testLoginCredentials();
  await testNextAuthConfig();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DOS TESTES\n');
  
  const passed = results.filter(r => r.status === '✅ PASSOU').length;
  const failed = results.filter(r => r.status === '❌ FALHOU').length;
  const total = results.length;
  
  console.log(`Total de testes: ${total}`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`Taxa de sucesso: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('❌ TESTES QUE FALHARAM:\n');
    results
      .filter(r => r.status === '❌ FALHOU')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log('\n⚠️  Corrija os problemas acima antes de fazer deploy!');
  } else {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ O sistema está pronto para produção!');
  }
  
  console.log('\n🔑 Credenciais de Teste:');
  console.log('   Admin: admin@macofel.com / admin123');
  console.log('   Cliente: cliente@teste.com / cliente123');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
