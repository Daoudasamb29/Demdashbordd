import React, { useState } from 'react';
import { Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ShieldCheck, Database, Info } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface LoginViewProps {
  onLoginSuccess: (user: { email: string; name: string; source: 'supabase' | 'local'; id?: string }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showLocalFallbackBtn, setShowLocalFallbackBtn] = useState(false);

  const dbConnected = isSupabaseConfigured();

  const handleLocalFallback = () => {
    setErrorMsg('');
    setSuccessMsg('Bypass active : basculement de secours en mode Sandbox local...');
    setTimeout(() => {
      try {
        const localUsersRaw = localStorage.getItem('jengu_users');
        const localUsersList = localUsersRaw ? JSON.parse(localUsersRaw) : [];
        
        let found = localUsersList.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase()
        );
        
        if (!found) {
          // Auto-registration on fallback bypass to avoid blocked users
          found = {
            id: 'local-' + Math.floor(100000 + Math.random() * 900000),
            email: email,
            password: password,
            name: name || email.split('@')[0] || 'Dispatcher',
            role: 'dispatcher'
          };
          localUsersList.push(found);
          localStorage.setItem('jengu_users', JSON.stringify(localUsersList));
        }
        
        setSuccessMsg('Connexion de secours réussie !');
        setTimeout(() => {
          onLoginSuccess({
            email: found.email,
            name: found.name,
            source: 'local',
            id: found.id,
          });
        }, 600);
      } catch (e) {
        setErrorMsg('Une erreur s\'est produite lors de la connexion locale.');
      }
    }, 500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowLocalFallbackBtn(false);

    if (!email || !password) {
      setErrorMsg('Veuillez remplir tous les champs requis, s\'il vous plaît.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      setLoading(false);
      return;
    }

    if (dbConnected && supabase) {
      try {
        if (isSignUp) {
          // SIGN UP
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name || email.split('@')[0],
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            setSuccessMsg('Votre compte a été créé avec succès dans Supabase ! Vous pouvez maintenant vous connecter.');
            setIsSignUp(false);
            setPassword('');
          }
        } else {
          // SIGN IN
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            const userName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Dispatcher';
            setSuccessMsg('Connexion d\'authentification Supabase réussie !');
            setTimeout(() => {
              onLoginSuccess({
                email: data.user!.email || email,
                name: userName,
                source: 'supabase',
                id: data.user!.id,
              });
            }, 600);
          }
        }
      } catch (err: any) {
        console.error('Erreur Supabase Auth:', err);
        setShowLocalFallbackBtn(true);
        
        const message = err.message || '';
        if (message.includes('confirmation email') || message.includes('confirm')) {
          setErrorMsg(
            '⚠️ Paramètre d\'activation Supabase détecté : Votre projet Supabase exige la validation d\'e-mail (Email confirmation). Pour utiliser l\'authentification Cloud sans bloquer les utilisateurs, désactivez "Confirm email" dans l\'onglet Auth > Providers > Email de votre tableau de bord Supabase.'
          );
        } else if (message.includes('Invalid login credentials') || message.includes('credentials') || message.includes('invalid')) {
          setErrorMsg(
            'Mot de passe ou identifiants Supabase incorrects. Si vous n\'avez pas encore créé de compte sur ce serveur Cloud, inscrivez-vous d\'abord ou utilisez le bouton de secours local ci-dessous.'
          );
        } else {
          setErrorMsg(`Erreur réseau Supabase : ${message}`);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // LOCAL SIMULATED AUTH (fallback)
      setTimeout(() => {
        try {
          const localUsersRaw = localStorage.getItem('jengu_users');
          const localUsersList = localUsersRaw ? JSON.parse(localUsersRaw) : [];

          if (isSignUp) {
            // Check duplicate
            const exists = localUsersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
              setErrorMsg('Cet email est déjà enregistré localement.');
              setLoading(false);
              return;
            }

            const newUser = {
              id: 'local-' + Math.floor(100000 + Math.random() * 900000),
              email,
              password,
              name: name || email.split('@')[0],
              role: 'dispatcher'
            };

            localUsersList.push(newUser);
            localStorage.setItem('jengu_users', JSON.stringify(localUsersList));

            setSuccessMsg('Compte local créé avec succès ! Vous pouvez vous connecter.');
            setIsSignUp(false);
            setPassword('');
          } else {
            // SignIn lookup
            const found = localUsersList.find(
              (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );

            // Default fallback if initial list empty to let user log in immediately using 'demo@jengu.tech'
            if (!found && email === 'demo@jengu.tech' && password === 'password') {
              const defaultUser = {
                email: 'demo@jengu.tech',
                name: 'Saliou Diop',
                source: 'local' as const,
              };
              setSuccessMsg('Connexion de démonstration réussie !');
              setTimeout(() => {
                onLoginSuccess(defaultUser);
              }, 600);
              return;
            }

            if (!found) {
              setErrorMsg('Email ou mot de passe incorrect. Essayez demo@jengu.tech / password ou créez un compte.');
              setLoading(false);
              return;
            }

            setSuccessMsg('Connexion locale réussie !');
            setTimeout(() => {
              onLoginSuccess({
                email: found.email,
                name: found.name,
                source: 'local',
                id: found.id,
              });
            }, 600);
          }
        } catch (e) {
          setErrorMsg('Une erreur locale s\'est produite.');
        } finally {
          setLoading(false);
        }
      }, 700);
    }
  };

  return (
    <div id="login-container" className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative gradient light rings */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col p-8 space-y-7">
        
        {/* Top Header Logo Component */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/15 antialiased">
            JT
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-widest uppercase flex items-center justify-center gap-1.5">
              JENGU_TECH <span className="text-blue-500">•</span> DRIVEOPS
            </h2>
            <p className="text-xs text-slate-400 font-medium">Portail de dispatch et de supervision VTC</p>
          </div>
        </div>

        {/* Database Connectivity Status indicator badge */}
        <div className={`rounded-xl p-3 border text-xs flex items-center justify-between ${
          dbConnected 
            ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/5 text-amber-400 border-amber-500/15'
        }`}>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <div>
              <span className="font-bold uppercase tracking-wider block text-[9.5px]">
                {dbConnected ? 'Mode Cloud Supabase' : 'Mode Local Sandbox'}
              </span>
              <span className="text-[9px] text-slate-400 block font-normal">
                {dbConnected ? 'Enregistrement direct sur votre base Supabase' : 'Sauvegarde sécurisée dans le navigateur (localStorage)'}
              </span>
            </div>
          </div>
          <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
        </div>

        {/* Form Container */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email message notification alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Nom Complet</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: Saliou Diop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500/90 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Adresse Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="nom@jengu.tech"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500/90 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Mot de passe</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500/90 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
              />
            </div>
          </div>

          <button
            id="btn-submit-auth"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 font-extrabold text-white rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10 active:scale-98"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin"></span>
            ) : (
              <>
                <span>{isSignUp ? "Créer mon compte dispatcher" : "Accéder à l'interface"}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {showLocalFallbackBtn && (
            <div className="pt-1.5 space-y-2 animate-fade-in">
              <div className="w-full h-[1px] bg-slate-800/80"></div>
              <button
                id="btn-local-fallback"
                type="button"
                onClick={handleLocalFallback}
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700/80 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
              >
                <Database className="w-4 h-4" />
                <span>Utiliser le Mode Sandbox (Local)</span>
              </button>
              <p className="text-[10px] text-center text-slate-400">
                L'authentification s'effectuera directement sur le stockage local de votre navigateur.
              </p>
            </div>
          )}
        </form>

        {/* Form selection toggle footer */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400">
            {isSignUp ? "Vous avez déjà un compte dispatcher ?" : "Nouveau dispatcher sur la plateforme ?"}
            <button
              id="btn-toggle-auth-mode"
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="ml-1.5 font-bold text-blue-400 hover:text-blue-300 underline focus:outline-none"
            >
              {isSignUp ? "Connectez-vous" : "Inscrivez-vous ici"}
            </button>
          </p>
        </div>

        {/* Demo instructions if offline */}
        {!dbConnected && !isSignUp && (
          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 text-[10.5px] text-slate-400 leading-relaxed font-normal">
            <span className="font-bold text-amber-400 flex items-center gap-1 mb-1">
              <Info className="w-3.5 h-3.5" /> Guide d'utilisation rapide
            </span>
            Vous pouvez vous connecter directement en utilisant le compte de démonstration prédéfini :
            <div className="mt-1 bg-slate-950/80 p-1.5 rounded font-mono text-slate-300 select-text flex justify-between">
              <span>demo@jengu.tech</span>
              <span className="text-slate-500">password</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
