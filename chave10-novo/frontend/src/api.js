const BASE = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('c10_token');
}

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

const get  = (url)        => req('GET',    url);
const post = (url, body)  => req('POST',   url, body);
const put  = (url, body)  => req('PUT',    url, body);
const patch= (url, body)  => req('PATCH',  url, body);
const del  = (url)        => req('DELETE', url);

export const api = {
  auth: {
    login: (email, senha) => post('/auth/login', { email, senha }),
  },
  admin: {
    dashboard: ()                    => get('/admin/dashboard'),
    oficinas:  {
      list:    (status)              => get('/admin/oficinas' + (status ? '?status='+status : '')),
      create:  (data)                => post('/admin/oficinas', data),
      update:  (id, data)            => put('/admin/oficinas/'+id, data),
      setStatus:(id, status)         => patch('/admin/oficinas/'+id+'/status', { status }),
      remove:  (id)                  => del('/admin/oficinas/'+id),
      usuarios:(id)                  => get('/admin/oficinas/'+id+'/usuarios'),
      detalhes:(id)                  => get('/admin/oficinas/'+id+'/detalhes'),
    },
    vencendo:  ()                    => get('/admin/vencendo'),
    renovarLote:(data)               => post('/admin/renovar-lote', data),
    usuarios: {
      create:  (data)                => post('/admin/usuarios', data),
    },
    pagamentos: {
      list:    (oficina_id)          => get('/admin/pagamentos' + (oficina_id ? '?oficina_id='+oficina_id : '')),
      create:  (data)                => post('/admin/pagamentos', data),
    },
  },
  app: {
    dashboard: ()                    => get('/app/dashboard'),
    clientes: {
      list:    (q)                   => get('/app/clientes' + (q ? '?q='+encodeURIComponent(q) : '')),
      create:  (data)                => post('/app/clientes', data),
      update:  (id, data)            => put('/app/clientes/'+id, data),
      remove:  (id)                  => del('/app/clientes/'+id),
    },
    veiculos: {
      list:    (cliente_id)          => get('/app/veiculos' + (cliente_id ? '?cliente_id='+cliente_id : '')),
      create:  (data)                => post('/app/veiculos', data),
      update:  (id, data)            => put('/app/veiculos/'+id, data),
      remove:  (id)                  => del('/app/veiculos/'+id),
    },
    os: {
      list:    (status)              => get('/app/os' + (status ? '?status='+status : '')),
      create:  (data)                => post('/app/os', data),
      update:  (id, data)            => put('/app/os/'+id, data),
      setStatus:(id, status)         => patch('/app/os/'+id+'/status', { status }),
      remove:  (id)                  => del('/app/os/'+id),
    },
    orcamentos: {
      list:    ()                    => get('/app/orcamentos'),
      create:  (data)                => post('/app/orcamentos', data),
      update:  (id, data)            => put('/app/orcamentos/'+id, data),
      setStatus:(id, status)         => patch('/app/orcamentos/'+id+'/status', { status }),
      remove:  (id)                  => del('/app/orcamentos/'+id),
    },
  },
};
