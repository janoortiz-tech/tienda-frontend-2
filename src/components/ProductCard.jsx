import React from 'react';

export function ProductCard({ producto, onAgregarAlCarrito }) {
    const imagenMostrar = producto.imagen_url || producto.imagen || 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=512&hei=512&fmt=p-jpg';

    return (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '18px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <img
                src={imagenMostrar}
                alt={producto.nombre}
                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginBottom: '16px' }}
            />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{producto.nombre}</h3>
            <p style={{ fontSize: '13px', color: '#86868b', marginBottom: '12px' }}>{producto.descripcion}</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#0071e3', marginBottom: '16px' }}>
                ${Number(producto.precio).toLocaleString('es-AR')}
            </p>
            <button
                className="btn-nav-apple btn-catalogo"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={() => onAgregarAlCarrito(producto)}
            >
                Agregar al carrito
            </button>
        </div>
    );
}