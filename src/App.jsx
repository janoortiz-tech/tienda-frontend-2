import React, { useState, useEffect } from 'react';
import './App.css';
import { ProductCard } from './components/ProductCard';
import { BotonArrepentimiento } from './components/BotonArrepentimiento';

const API_URL = 'https://tienda-backend-2-ojq4.onrender.com';

function App() {
  const [vista, setVista] = useState('catalogo');
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Persistencia del Carrito en localStorage
  const [carrito, setCarrito] = useState(() => {
    const carritoGuardado = localStorage.getItem('carrito_tienda');
    return carritoGuardado ? JSON.parse(carritoGuardado) : [];
  });

  const [token, setToken] = useState(localStorage.getItem('token_usuario') || null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [esRegistro, setEsRegistro] = useState(false);

  // Formulario Login / Registro
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aceptoTratamiento, setAceptoTratamiento] = useState(true);

  // Formulario Admin (Crear / Editar Producto)
  const [editandoProductoId, setEditandoProductoId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevaImagen, setNuevaImagen] = useState('');

  // Sincronizar el carrito en localStorage
  useEffect(() => {
    localStorage.setItem('carrito_tienda', JSON.stringify(carrito));
  }, [carrito]);

  // Cálculo del Total a Pagar
  const totalCarrito = carrito.reduce((total, item) => total + (Number(item.precio) || 0), 0);

  // Nombre del usuario para mostrar en el botón superior derecho
  const nombreUsuario = usuarioActual?.nombre || usuarioActual?.email || 'Usuario';

  const obtenerTextoRespuesta = (data) => {
    if (!data) return 'Error desconocido en el servidor';
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((err) => `${err.loc ? err.loc[err.loc.length - 1] + ': ' : ''}${err.msg}`).join('\n');
    }
    if (data.mensaje) return data.mensaje;
    if (data.message) return data.message;
    return JSON.stringify(data);
  };

  useEffect(() => {
    obtenerProductos();
    if (token) {
      obtenerUsuarioActual(token);
    }
  }, [token]);

  const obtenerProductos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/productos`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
      }
    } catch (err) {
      console.error('Error al obtener productos:', err);
    } finally {
      setLoading(false);
    }
  };

  const obtenerUsuarioActual = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarioActual(data);
      } else {
        cerrarSesion();
      }
    } catch (err) {
      console.error('Error al verificar sesión:', err);
    }
  };

  const obtenerPedidos = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/pedidos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
      }
    } catch (err) {
      console.error('Error al obtener pedidos:', err);
    }
  };

  const obtenerTodosLosPedidosAdmin = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/pedidos/todos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodosPedidos(data);
      }
    } catch (err) {
      console.error('Error al obtener todos los pedidos:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          password,
          acepto_tratamiento: aceptoTratamiento
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('¡Usuario registrado con éxito! Ahora podés iniciar sesión.');
        setEsRegistro(false);
        setPassword('');
      } else {
        const errorMsg = obtenerTextoRespuesta(data);
        alert(`Error de registro:\n${errorMsg}`);
      }
    } catch (err) {
      alert('Error de conexión con el servidor backend.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      let res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) {
        res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, email: email, password: password })
        });
      }

      const data = await res.json();

      if (res.ok) {
        const userToken = data.access_token || data.token;
        setToken(userToken);
        localStorage.setItem('token_usuario', userToken);
        await obtenerUsuarioActual(userToken);
        setVista('catalogo');
      } else {
        const errorMsg = obtenerTextoRespuesta(data);
        alert(`Error al iniciar sesión:\n${errorMsg}`);
      }
    } catch (err) {
      alert('Error al conectar con el backend.');
    }
  };

  const cerrarSesion = () => {
    setToken(null);
    setUsuarioActual(null);
    localStorage.removeItem('token_usuario');
    setVista('catalogo');
  };

  const agregarAlCarrito = (prod) => {
    setCarrito([...carrito, prod]);
    alert(`¡${prod.nombre} agregado al carrito!`);
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem('carrito_tienda');
  };

  const realizarPedido = async () => {
    if (!token) {
      alert('Debes iniciar sesión para realizar una compra.');
      setVista('login');
      return;
    }

    if (carrito.length === 0) return;

    try {
      const peticiones = carrito.map(item => {
        return fetch(`${API_URL}/pedidos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            producto_id: item.id,
            cantidad: 1
          })
        });
      });

      const respuestas = await Promise.all(peticiones);
      const todasOk = respuestas.every(res => res.ok);

      if (todasOk) {
        alert(`¡Pedido registrado en la Base de Datos con éxito!\nMonto Total: $${totalCarrito.toLocaleString('es-AR')}`);
        vaciarCarrito();
        setVista('pedidos');
        obtenerPedidos();
      } else {
        const primeraError = respuestas.find(res => !res.ok);
        const data = await primeraError.json();
        const errorMsg = obtenerTextoRespuesta(data);
        alert(`Error al procesar la compra:\n${errorMsg}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al procesar el pedido.');
    }
  };

  const esAdmin = usuarioActual && (usuarioActual.es_admin || usuarioActual.is_admin || usuarioActual.rol === 'admin' || usuarioActual.role === 'admin');

  const limpiarFormularioProducto = () => {
    setEditandoProductoId(null);
    setNuevoNombre('');
    setNuevaDesc('');
    setNuevoPrecio('');
    setNuevaImagen('');
  };

  const cargarProductoParaEditar = (prod) => {
    setEditandoProductoId(prod.id);
    setNuevoNombre(prod.nombre || '');
    setNuevaDesc(prod.descripcion || '');
    setNuevoPrecio(prod.precio || '');
    setNuevaImagen(prod.imagen_url || prod.imagen || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardarProductoAdmin = async (e) => {
    e.preventDefault();
    const urlImagenFinal = nuevaImagen || 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=512&hei=512&fmt=p-jpg';
    const payload = {
      nombre: nuevoNombre,
      descripcion: nuevaDesc,
      precio: parseFloat(nuevoPrecio),
      imagen_url: urlImagenFinal,
      imagen: urlImagenFinal
    };

    try {
      const url = editandoProductoId
        ? `${API_URL}/productos/${editandoProductoId}`
        : `${API_URL}/productos`;
      const method = editandoProductoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editandoProductoId ? '¡Producto actualizado con éxito!' : '¡Producto creado en la Base de Datos!');
        limpiarFormularioProducto();
        obtenerProductos();
      } else {
        const data = await res.json().catch(() => null);
        alert(`Error al guardar producto:\n${obtenerTextoRespuesta(data)}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el backend.');
    }
  };

  const eliminarProductoAdmin = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto de la DB?')) return;
    try {
      const res = await fetch(`${API_URL}/productos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Producto eliminado.');
        obtenerProductos();
      } else {
        const data = await res.json().catch(() => null);
        alert(`No se pudo eliminar el producto:\n${obtenerTextoRespuesta(data)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cambiarEstadoPedidoAdmin = async (pedidoId, nuevoEstado) => {
    try {
      let res = await fetch(`${API_URL}/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      // Fallback si FastAPI espera el estado como query parameter (?estado=...)
      if (res.status === 422) {
        res = await fetch(`${API_URL}/pedidos/${pedidoId}/estado?estado=${encodeURIComponent(nuevoEstado)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (res.ok) {
        alert(`Pedido #${pedidoId} actualizado a "${nuevoEstado}"`);
        obtenerTodosLosPedidosAdmin();
        obtenerPedidos();
      } else {
        const data = await res.json().catch(() => null);
        alert(`Error al actualizar estado:\n${obtenerTextoRespuesta(data)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarPedidoAdmin = async (pedidoId) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el Pedido #${pedidoId} de la base de datos?`)) return;
    try {
      const res = await fetch(`${API_URL}/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Pedido #${pedidoId} eliminado.`);
        obtenerTodosLosPedidosAdmin();
        obtenerPedidos();
      } else {
        const data = await res.json().catch(() => null);
        alert(`Error al eliminar pedido:\n${obtenerTextoRespuesta(data)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ backgroundColor: '#fbfbfd', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <header className="navbar-apple">
        <div className="brand-title" style={{ cursor: 'pointer' }} onClick={() => setVista('catalogo')}>
           Tienda Express
        </div>

        <nav className="nav-links">
          <button className={`btn-nav-apple ${vista === 'catalogo' ? 'btn-catalogo' : 'btn-pedidos'}`} onClick={() => setVista('catalogo')}>
            ⚡ Catálogo
          </button>

          <button className={`btn-nav-apple ${vista === 'carrito' ? 'btn-carrito' : 'btn-pedidos'}`} onClick={() => setVista('carrito')}>
            🛒 Carrito ({carrito.length})
          </button>

          {token && (
            <button className={`btn-nav-apple ${vista === 'pedidos' ? 'btn-catalogo' : 'btn-pedidos'}`} onClick={() => { setVista('pedidos'); obtenerPedidos(); }}>
              📦 Mis Pedidos
            </button>
          )}

          {esAdmin && (
            <button className="btn-nav-apple btn-arrepentimiento-glow" onClick={() => { setVista('admin'); obtenerTodosLosPedidosAdmin(); obtenerProductos(); }}>
              ⚙️ Panel Admin
            </button>
          )}

          {token ? (
            <button className="btn-nav-apple btn-salir" onClick={cerrarSesion}>
              🚪 Salir ({nombreUsuario})
            </button>
          ) : (
            <button className="btn-nav-apple btn-catalogo" onClick={() => setVista('login')}>
              Acceder
            </button>
          )}
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '20px' }}>

        {/* CATÁLOGO */}
        {vista === 'catalogo' && (
          <>
            <section className="hero-header">
              <h1 className="gradient-text-animated">iPhone</h1>
              <p className="hero-subtitle">Diseñados para enamorar.</p>
            </section>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>Cargando catálogo...</p>
            ) : productos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>No hay productos registrados en la base de datos.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '30px' }}>
                {productos.map((prod) => (
                  <ProductCard key={prod.id} producto={prod} onAgregarAlCarrito={agregarAlCarrito} />
                ))}
              </div>
            )}
          </>
        )}

        {/* CARRITO */}
        {vista === 'carrito' && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Tu Carrito</h2>
            {carrito.length === 0 ? (
              <p style={{ color: '#86868b' }}>Tu carrito está vacío.</p>
            ) : (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                {carrito.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: '#fff', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <span style={{ fontWeight: '500' }}>{item.nombre}</span>
                    <strong>${Number(item.precio).toLocaleString('es-AR')}</strong>
                  </div>
                ))}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  marginTop: '16px',
                  border: '2px solid #0071e3',
                  boxShadow: '0 4px 14px rgba(0, 113, 227, 0.12)'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f' }}>Total a pagar:</span>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: '#0071e3' }}>
                    ${totalCarrito.toLocaleString('es-AR')}
                  </span>
                </div>

                <button
                  className="btn-nav-apple btn-catalogo"
                  style={{ marginTop: '20px', width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}
                  onClick={realizarPedido}
                >
                  Confirmar y Guardar Pedido
                </button>

                <button
                  onClick={vaciarCarrito}
                  style={{ marginTop: '12px', background: 'none', border: 'none', color: '#ff3b30', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL DE PEDIDOS */}
        {vista === 'pedidos' && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px', fontWeight: '700' }}>Historial de Pedidos</h2>
            {pedidos.length === 0 ? (
              <p style={{ color: '#86868b' }}>No hay pedidos registrados.</p>
            ) : (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {pedidos.map((ped, idx) => (
                  <div key={ped.id || idx} style={{ padding: '16px 20px', background: '#fff', borderRadius: '14px', marginBottom: '12px', textAlign: 'left', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 4px 0', color: '#1d1d1f' }}>
                        Pedido #{ped.id || idx + 1}
                      </p>
                      <p style={{ fontSize: '13px', color: '#86868b', margin: 0 }}>
                        Estado: <span style={{ color: '#0071e3', fontWeight: '600' }}>{ped.estado || 'pendiente'}</span>
                      </p>
                    </div>
                    {ped.total && (
                      <strong style={{ fontSize: '16px', color: '#1d1d1f' }}>
                        ${Number(ped.total).toLocaleString('es-AR')}
                      </strong>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOGIN / REGISTRO */}
        {vista === 'login' && (
          <div style={{ maxWidth: '380px', margin: '50px auto', background: '#fff', padding: '32px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: '700' }}>
              {esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>

            <form onSubmit={esRegistro ? handleRegister : handleLogin}>
              {esRegistro && (
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', marginBottom: '12px', boxSizing: 'border-box' }}
                />
              )}

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', marginBottom: '12px', boxSizing: 'border-box' }}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', marginBottom: esRegistro ? '12px' : '20px', boxSizing: 'border-box' }}
              />

              {esRegistro && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#86868b', marginBottom: '20px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aceptoTratamiento}
                    onChange={(e) => setAceptoTratamiento(e.target.checked)}
                    required
                  />
                  Acepto el tratamiento de datos personales
                </label>
              )}

              <button type="submit" className="btn-nav-apple btn-catalogo" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {esRegistro ? 'Registrarse' : 'Entrar'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button type="button" onClick={() => setEsRegistro(!esRegistro)} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                {esRegistro ? '¿Ya tienes una cuenta? Iniciar sesión' : '¿No tienes cuenta? Crea una aquí'}
              </button>
            </div>
          </div>
        )}

        {/* PANEL ADMIN COMPLETO */}
        {vista === 'admin' && esAdmin && (
          <div style={{ padding: '20px 0' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Panel de Control de Administrador</h2>
            <p style={{ color: '#86868b', marginBottom: '30px' }}>Gestión total de productos y pedidos guardados en la base de datos.</p>

            {/* FORMULARIO CREAR / EDITAR PRODUCTO */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>
                {editandoProductoId ? `Editando Producto #${editandoProductoId}` : 'Crear Nuevo Producto'}
              </h3>
              <form onSubmit={guardarProductoAdmin} style={{ display: 'grid', gap: '12px' }}>
                <input type="text" placeholder="Nombre del iPhone (ej. iPhone 15 Pro)" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
                <input type="text" placeholder="Descripción" value={nuevaDesc} onChange={(e) => setNuevaDesc(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
                <input type="number" step="0.01" placeholder="Precio ($)" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
                <input type="url" placeholder="URL de la imagen (https://...)" value={nuevaImagen} onChange={(e) => setNuevaImagen(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-nav-apple btn-catalogo" style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>
                    {editandoProductoId ? 'Actualizar Producto' : 'Guardar Producto en DB'}
                  </button>
                  {editandoProductoId && (
                    <button type="button" onClick={limpiarFormularioProducto} className="btn-nav-apple btn-salir" style={{ padding: '12px 20px' }}>
                      Cancelar Edición
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* GESTIÓN DEL CATÁLOGO (EDITAR Y ELIMINAR) */}
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Gestión del Catálogo ({productos.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '40px' }}>
              {productos.map((prod) => (
                <div key={prod.id} style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #eee' }}>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>{prod.nombre}</p>
                  <p style={{ fontSize: '13px', color: '#86868b', marginBottom: '8px' }}>{prod.descripcion}</p>
                  <p style={{ color: '#0071e3', fontWeight: '700', marginBottom: '12px' }}>${prod.precio}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => cargarProductoParaEditar(prod)} className="btn-nav-apple btn-catalogo" style={{ flex: 1, justifyContent: 'center' }}>
                      Editar
                    </button>
                    <button onClick={() => eliminarProductoAdmin(prod.id)} className="btn-nav-apple btn-salir" style={{ flex: 1, justifyContent: 'center' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* GESTIÓN GLOBAL DE PEDIDOS */}
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Gestión Global de Pedidos ({todosPedidos.length})</h3>
            {todosPedidos.length === 0 ? (
              <p style={{ color: '#86868b' }}>No hay pedidos cargados en el sistema.</p>
            ) : (
              todosPedidos.map((ped, idx) => (
                <div key={ped.id || idx} style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div>
                    <p style={{ fontWeight: '700', margin: '0 0 4px 0' }}>
                      Pedido #{ped.id} {ped.usuario_id ? `(Usuario ID: ${ped.usuario_id})` : ''}
                    </p>
                    <p style={{ fontSize: '13px', color: '#86868b', margin: 0 }}>
                      Estado actual: <strong style={{ color: '#0071e3' }}>{ped.estado || 'pendiente'}</strong>
                      {ped.total ? ` — Total: $${Number(ped.total).toLocaleString('es-AR')}` : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={ped.estado || 'pendiente'}
                      onChange={(e) => cambiarEstadoPedidoAdmin(ped.id, e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="enviado">Enviado</option>
                      <option value="reembolsado">Reembolsado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>

                    <button onClick={() => eliminarPedidoAdmin(ped.id)} className="btn-nav-apple btn-salir">
                      Eliminar Pedido
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DEFENSORIA DEL CONSUMIDOR / BOTÓN DE ARREPENTIMIENTO */}
        {vista === 'arrepentimiento' && (
          <div style={{ maxWidth: '650px', margin: '30px auto', background: '#fff', padding: '36px', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '10px', color: '#1d1d1f' }}>
              Botón de Arrepentimiento
            </h2>
            <p style={{ fontSize: '14px', color: '#0071e3', fontWeight: '600', marginBottom: '24px' }}>
              Marco Legal — Ley N° 24.240 de Defensa del Consumidor
            </p>

            <div style={{ textAlign: 'left', fontSize: '14px', color: '#424245', lineHeight: '1.6', marginBottom: '28px', background: '#f5f5f7', padding: '20px', borderRadius: '16px' }}>
              <p style={{ marginBottom: '12px' }}>
                Conforme a lo establecido en la <strong>Ley N° 24.240</strong> y las resoluciones de la Secretaría de Comercio Interior de la Nación, todo comprador tiene derecho a revocar la aceptación de la compra efectuada a través de este sitio web.
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Plazo legal:</strong> Disponés de un plazo de <strong>10 días corridos</strong> contados a partir de la entrega del producto o de la fecha de compra para ejercer este derecho.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Sin costo adicional:</strong> La solicitud de revocación no genera ningún costo ni penalización económica para el cliente.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Reembolso:</strong> La devolución del importe abonado se efectuará utilizando el mismo medio de pago empleado al momento de realizar la compra.
                </li>
              </ul>
              <p style={{ margin: 0, fontSize: '13px', color: '#86868b' }}>
                Para iniciar la solicitud de revocación, completá los datos a continuación y nuestro equipo te contactará dentro de las 24 horas hábiles.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert('Solicitud de revocación registrada con éxito.'); setVista('catalogo'); }}>
              <input
                type="text"
                placeholder="Número de Pedido o Referencia"
                required
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', boxSizing: 'border-box' }}
              />
              <input
                type="email"
                placeholder="Correo electrónico asociado a la compra"
                required
                style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #d2d2d7', boxSizing: 'border-box' }}
              />
              <button type="submit" className="btn-arrepentimiento-glow" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                Enviar Solicitud de Revocación
              </button>
            </form>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer-apple">
        <p style={{ fontSize: '12px', color: '#86868b', marginBottom: '16px' }}>
          © Tienda Express — Defensa del Consumidor (Ley N° 24.240)
        </p>
        <BotonArrepentimiento onClick={() => setVista('arrepentimiento')} />
      </footer>

    </div>
  );
}

export default App;
