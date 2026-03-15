'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function EnderecosPage() {
  const { data: session, status } = useSession() ?? {};
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses();
    }
  }, [status]);

  const fetchAddresses = async () => {
    try {
      // Por enquanto, vamos simular dados
      // Você pode criar uma API para gerenciar endereços depois
      setAddresses([]);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Implementar lógica de salvar endereço
    toast.success('Endereço salvo com sucesso!');
    setShowForm(false);
    setEditingAddress(null);
    setFormData({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: false,
    });
    fetchAddresses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) {
      return;
    }
    
    // Implementar lógica de deletar endereço
    toast.success('Endereço excluído com sucesso!');
    fetchAddresses();
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      street: address.street,
      number: address.number,
      complement: address.complement ?? '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      isDefault: address.isDefault,
    });
    setShowForm(true);
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Endereços</h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus endereços de entrega
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingAddress(null);
            setFormData({
              street: '',
              number: '',
              complement: '',
              neighborhood: '',
              city: '',
              state: '',
              zipCode: '',
              isDefault: false,
            });
          }}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="00000-000"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Definir como endereço padrão</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingAddress(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <MapPin className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Nenhum endereço cadastrado
          </h2>
          <p className="text-gray-600 mb-6">
            Adicione um endereço para facilitar suas compras
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-lg shadow p-6 border-2 border-transparent hover:border-red-200 transition-colors"
            >
              {address.isDefault && (
                <span className="inline-block px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded mb-3">
                  Padrão
                </span>
              )}
              <div className="space-y-2">
                <p className="font-medium text-gray-900">
                  {address.street}, {address.number}
                </p>
                {address.complement && (
                  <p className="text-sm text-gray-600">{address.complement}</p>
                )}
                <p className="text-sm text-gray-600">
                  {address.neighborhood} - {address.city}/{address.state}
                </p>
                <p className="text-sm text-gray-600">CEP: {address.zipCode}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(address)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
