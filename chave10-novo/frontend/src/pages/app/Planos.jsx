const CHECK = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const X     = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function AppPlanos() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Planos do Chave 10</div><div className="page-subtitle">Escolha o plano ideal para organizar sua oficina</div></div>
      </div>

      <div className="planos-wrap">

        {/* Gratuito */}
        <div className="plano-card">
          <div className="plano-nome">Plano Gratuito</div>
          <div className="plano-preco-wrap">
            <span className="plano-preco">R$0</span>
            <span className="plano-periodo">/mês</span>
          </div>
          <p className="plano-desc">Para quem está começando e quer experimentar o sistema.</p>
          <ul className="plano-lista">
            <li>{CHECK} Até 5 clientes</li>
            <li>{CHECK} Até 10 ordens de serviço</li>
            <li>{CHECK} Dashboard básico</li>
            <li className="plano-item-off">{X} Orçamentos via WhatsApp</li>
            <li className="plano-item-off">{X} Relatórios avançados</li>
            <li className="plano-item-off">{X} Suporte prioritário</li>
          </ul>
          <button className="btn btn-outline" style={{width:'100%',justifyContent:'center'}} disabled>Plano atual</button>
        </div>

        {/* Profissional — destaque */}
        <div className="plano-card plano-destaque">
          <div className="plano-selo">⭐ Mais escolhido</div>
          <div className="plano-nome">Plano Profissional</div>
          <div className="plano-preco-wrap">
            <span className="plano-preco">R$29</span>
            <span className="plano-periodo">/mês</span>
          </div>
          <div className="plano-urgencia">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Oferta exclusiva para os 10 primeiros clientes
          </div>
          <div className="plano-depois">Depois será R$49/mês</div>
          <p className="plano-sem-fidelidade">Sem fidelidade • Cancele quando quiser</p>
          <ul className="plano-lista">
            <li>{CHECK} Clientes ilimitados</li>
            <li>{CHECK} Veículos ilimitados</li>
            <li>{CHECK} Ordens de serviço ilimitadas</li>
            <li>{CHECK} Orçamentos via WhatsApp</li>
            <li>{CHECK} Relatórios e dashboard completo</li>
            <li>{CHECK} Suporte prioritário</li>
          </ul>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:13,fontSize:15}}
            onClick={()=>window.open('https://wa.me/5516992915540?text=Ol%C3%A1%2C%20quero%20garantir%20o%20plano%20promocional%20de%20R%2429%20do%20Chave%2010.','_blank')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
            Quero esse plano
          </button>
        </div>
      </div>
    </div>
  );
}
