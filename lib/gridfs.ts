// MongoDB GridFS para armazenamento de imagens
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb-native';

let bucket: GridFSBucket | null = null;

async function getBucket(): Promise<GridFSBucket> {
  if (bucket) {
    return bucket;
  }

  const db = await connectToDatabase();
  bucket = new GridFSBucket(db, { bucketName: 'product_images' });
  return bucket;
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  metadata?: Record<string, any>
): Promise<string> {
  const gridfsBucket = await getBucket();
  
  return new Promise((resolve, reject) => {
    const uploadStream = gridfsBucket.openUploadStream(filename, {
      metadata: metadata || {},
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.end(file);
  });
}

export async function getImageStream(fileId: string) {
  const gridfsBucket = await getBucket();
  const objectId = new ObjectId(fileId);
  
  try {
    const downloadStream = gridfsBucket.openDownloadStream(objectId);
    return downloadStream;
  } catch (error) {
    return null;
  }
}

export async function deleteImage(fileId: string): Promise<boolean> {
  try {
    const gridfsBucket = await getBucket();
    const objectId = new ObjectId(fileId);
    await gridfsBucket.delete(objectId);
    return true;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return false;
  }
}

export async function getImageInfo(fileId: string) {
  try {
    const gridfsBucket = await getBucket();
    const objectId = new ObjectId(fileId);
    const files = await gridfsBucket.find({ _id: objectId }).toArray();
    return files[0] || null;
  } catch (error) {
    console.error('Erro ao buscar info da imagem:', error);
    return null;
  }
}
