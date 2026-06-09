import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogOut, Save, Shield, Loader2 } from 'lucide-react';
import { auth } from '../firebase';

export default function VaultPage() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    address: '',
    phone: '',
    aadhaar: '',
    pan: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Object.keys(data).length > 0) {
            setFormData({
              fullName: data.fullName || '',
              dob: data.dob || '',
              address: data.address || '',
              phone: data.phone || '',
              aadhaar: data.aadhaar || '',
              pan: data.pan || ''
            });
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Profile saved securely! (Your IDs are AES-256 encrypted in Firestore)');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="text-indigo-500 w-8 h-8" />
              Secure Profile Vault
            </h1>
            <p className="text-gray-400 mt-2">Welcome, {currentUser?.email}</p>
          </div>
          <Button variant="ghost" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </header>

        <Card className="p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-white/5 pb-2">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
                  <Input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Full Address</label>
                  <Input name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              <h2 className="text-xl font-semibold border-b border-white/5 pb-2">Government IDs (Encrypted)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Aadhaar / SSN</label>
                  <Input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="XXXX-XXXX-XXXX" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">PAN / Tax ID</label>
                  <Input name="pan" value={formData.pan} onChange={handleChange} placeholder="ABCDE1234F" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="submit" size="lg" className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving securely...' : 'Save Vault Data'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
