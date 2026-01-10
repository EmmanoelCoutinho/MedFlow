import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo-unxet.png';

export const Login: React.FC = () => {
  const { signInWithEmail, loading, authUser } = useAuth();
  const navigate = useNavigate();

  const [error] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = await signInWithEmail(email, password);
    if (!error) {
      navigate('/inbox');
    } else {
      alert('Erro ao entrar: ' + error.message);
    }
  }

  if (authUser) {
    navigate("/inbox");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Unxet"
            className="mx-auto w-56 mb-2 object-contain"
          />
          <p className="text-[#1E1E1E] text-lg">Central de Mensagens</p>
        </div>
        <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-6">Entrar</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
          >
            Entrar
          </Button>
        </form>
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-[#0A84FF] hover:underline">
            Problemas para entrar?
          </a>
        </div>
      </Card>
    </div>
  );
};
