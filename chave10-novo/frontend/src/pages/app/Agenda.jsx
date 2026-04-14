import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

const fmt = {
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const HORAS = Array.from({length:11},(_,i)=>i+8); // 8h às 18h

const STATUS_CLASS = { em_andamento:'agenda-event orange', finalizado:'agenda-event green' };

export default function AppAgenda() {
  const [osList, setOsList] = useState([]);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const navigate = useNavigate();

  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + semanaOffset * 7);
  inicioSemana.setHours(0,0,0,0);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  useEffect(() => {
    api.app.os.list().then(setOsList).catch(()=>setOsList([]));
  }, []);

  // Filtra OS da semana atual
  const osSemana = osList.filter(o => {
    if (!o.data) return false;
    const d = new Date(o.data + 'T12:00:00');
    return d >= inicioSemana && d <= fimSemana;
  });

  // Dias da semana
  const diasSemana = Array.from({length:7},(_,i)=>{
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate()+i);
    return d;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Agenda</div>
          <div className="page-subtitle">Semana de {fmt.date(inicioSemana.toISOString().split('T')[0])}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(o=>o-1)}>← Anterior</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(0)}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setSemanaOffset(o=>o+1)}>Próxima →</button>
          <button className="btn btn-primary" onClick={()=>navigate('/app/os')}>+ Agendar Serviço</button>
        </div>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="agenda-grid">
          {/* Header */}
          <div className="agenda-header-cell" style={{background:'var(--gray-50)'}}>Hora</div>
          {diasSemana.map((d,i)=>{
            const isToday = d.toDateString() === hoje.toDateString();
            return (
              <div key={i} className={`agenda-header-cell${isToday?' today':''}`}>
                {DIAS[d.getDay()]}<br/>
                <strong style={{fontSize:16}}>{d.getDate()}</strong>
              </div>
            );
          })}

          {/* Linhas de hora */}
          {HORAS.map(h=>(
            <>
              <div key={`t${h}`} className="agenda-time-cell">{h}:00</div>
              {diasSemana.map((d,i)=>{
                const dateStr = d.toISOString().split('T')[0];
                const eventos = osSemana.filter(o=>o.data===dateStr);
                return (
                  <div key={`${h}-${i}`} className="agenda-slot">
                    {h===8 && eventos.map(o=>(
                      <div key={o.id}
                        className={STATUS_CLASS[o.status]||'agenda-event orange'}
                        onClick={()=>navigate('/app/os')}
                        title={`${o.cliente_nome||''} — ${o.veiculo_modelo||''}`}
                        style={{cursor:'pointer'}}>
                        {o.cliente_nome?.split(' ')[0]||`OS #${String(o.id).padStart(4,'0')}`}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <p style={{fontSize:12,color:'var(--gray-400)',marginTop:12,textAlign:'center'}}>
        Os agendamentos são baseados nas datas das Ordens de Serviço desta semana.
      </p>
    </div>
  );
}
