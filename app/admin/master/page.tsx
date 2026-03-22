import { redirect } from 'next/navigation';

export default function MasterAdminIndexPage() {
  redirect('/admin/master/dashboard');
}
