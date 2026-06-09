import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Shield, Users, RefreshCw } from 'lucide-react';

interface AdminUser {
  uid: string;
  email: string;
  creationTime: string;
  lastSignInTime: string;
  profile: {
    fullName?: string;
    dob?: string;
    phone?: string;
    address?: string;
    aadhaar?: string;
    pan?: string;
    updatedAt?: string;
  } | null;
}

export default function AdminPage() {
  const { currentUser, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-navy-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="text-red-500 w-8 h-8" />
              Admin Command Center
            </h1>
            <p className="text-gray-400 mt-2">Manage all registered users and view decrypted profiles</p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-400">{currentUser?.email}</span>
            <Button variant="ghost" onClick={logout}>Sign out</Button>
          </div>
        </header>

        <Card className="p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> User Database
            </h2>
            <Button variant="ghost" onClick={fetchUsers} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-navy-800 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Account Email</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">DOB</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-red-300">Aadhaar (Decrypted)</th>
                  <th className="px-6 py-4 text-red-300">PAN (Decrypted)</th>
                  <th className="px-6 py-4 rounded-tr-lg">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{user.email}</td>
                    <td className="px-6 py-4">{user.profile?.fullName || '-'}</td>
                    <td className="px-6 py-4">{user.profile?.dob || '-'}</td>
                    <td className="px-6 py-4">{user.profile?.phone || '-'}</td>
                    <td className="px-6 py-4 font-mono text-red-300/80">{user.profile?.aadhaar || '-'}</td>
                    <td className="px-6 py-4 font-mono text-red-300/80">{user.profile?.pan || '-'}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(user.lastSignInTime).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
