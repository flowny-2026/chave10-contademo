import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api';

export default function Cadastro() {
  const [step, setStep] = useState(1); // 1=dados pessoais, 2=dados oficina
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [oficina, setOficina] = useState({ nome_oficina: '', cnpj_cpf: '', telefone: '', endereco: '', logo: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleCadastro(e) {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { token } = await api.auth.register({ nome: form.nome, email: form.email, senha: form.senha });
      setTempToken(token);
      setStep(2);
    } catch (err) {
      setErro(err.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess({ credential }) {
    setErro('');
    setLoading(true);
    try {
      const { token, needsOficina, usuario } = await api.auth.googleRegister(credential);
      if (needsOficina) {
        setTempToken(token);
        setStep(2);
      } else {
        localStorage.setItem('c10_token', token);
        if (usuario) localStorage.setItem('c10_user', JSON.stringify(usuario));
        navigate('/app/dashboard');
      }
    } catch (err) {
      setErro(err.error || 'Erro ao cadastrar com Google');
    } finally {
      setLoading(false);
    }
  }

  async function handleOficina(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const { token, usuario } = await api.auth.completeOficina(tempToken, oficina);
      localStorage.setItem('c10_token', token);
      localStorage.setItem('c10_user', JSON.stringify(usuario));
      navigate('/app/dashboard');
    } catch (err) {
      setErro(err.error || 'Erro ao salvar dados da oficina');
    } finally {
      setLoading(false);
    }
  }

  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0d1b2e 0%, #1a2f4a 100%)' }}>
        <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, padding: '40px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.5px', marginBottom: 8 }}>
              Chave <span style={{ color: 'var(--accent)' }}>10</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>Dados da sua oficina</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Complete seu cadastro com as informações da oficina</p>
          </div>

          <form onSubmit={handleOficina}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nome da oficina *</label>
              <input value={oficina.nome_oficina} onChange={e => setOficina(f => ({ ...f, nome_oficina: e.target.value }))} placeholder="Ex: Oficina do João" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>CNPJ ou CPF</label>
              <input value={oficina.cnpj_cpf} onChange={e => setOficina(f => ({ ...f, cnpj_cpf: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Telefone *</label>
              <input value={oficina.telefone} onChange={e => setOficina(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Endereço</label>
              <input value={oficina.endereco} onChange={e => setOficina(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Logo (URL)</label>
              <input value={oficina.logo} onChange={e => setOficina(f => ({ ...f, logo: e.target.value }))} placeholder="https://..." />
              <small style={{ fontSize: 11, color: 'var(--gray-400)', display: 'block', marginTop: 4 }}>Opcional: URL da logo da sua oficina</small>
            </div>

            {erro && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>{erro}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Salvando...' : 'Concluir cadastro'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-left-content">
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 24 }}>
            Chave <span style={{ color: '#F97316' }}>10</span>
          </div>
          <h2 className="login-headline">Organize sua oficina.<br />Cresça com dados.</h2>
          <p className="login-desc">Controle ordens de serviço, clientes, veículos e faturamento em um só lugar.</p>
          <div className="login-features">
            <div className="login-feat"><span className="feat-dot" />Dashboard com métricas em tempo real</div>
            <div className="login-feat"><span className="feat-dot" />Orçamentos enviados pelo WhatsApp</div>
            <div className="login-feat"><span className="feat-dot" />Histórico completo de cada veículo</div>
            <div className="login-feat"><span className="feat-dot" />Relatórios de desempenho da oficina</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.3px', marginBottom: 20 }}>
            Chave <span style={{ color: 'var(--accent)' }}>10</span>
          </div>
          <h1 className="login-title">Criar conta</h1>
          <p className="login-subtitle">Comece a usar gratuitamente por 7 dias.</p>

          {googleClientId && (
            <div style={{ marginBottom: 20 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErro('Falha ao conectar com o Google')}
                width="100%"
                text="signup_with"
                shape="rectangular"
                logo_alignment="left"
                locale="pt-BR"
              />
            </div>
          )}

          {googleClientId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
              <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>ou preencha os dados</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
            </div>
          )}

          <form onSubmit={handleCadastro}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nome completo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Seu nome" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Senha</label>
              <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Confirmar senha</label>
              <input type="password" value={form.confirmarSenha} onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))} placeholder="Digite a senha novamente" required />
            </div>

            {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
            Já tem uma conta? <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/login')}>Entrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
