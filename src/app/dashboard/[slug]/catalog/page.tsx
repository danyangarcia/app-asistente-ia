'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'

export interface CatalogItem {
  id: string
  nombre: string
  categoria: string
  precio: number
  disponible: boolean
}

export default function CatalogPage() {
  const pathname = usePathname()
  const slug = pathname.split('/')[2]
  const supabase = createClient()

  const [business, setBusiness] = useState<any>(null)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nombre: '', categoria: '', precio: '' as number | '' })

  // 1. Cargar el negocio y sus productos reales desde Supabase
  useEffect(() => {
    async function fetchData() {
      if (!slug) return
      setLoading(true)

      // Obtener negocio
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('enlace del panel', slug)
        .single()

      if (businessData) {
        setBusiness(businessData)

        // Obtener productos de este negocio específico
        const { data: catalogData, error } = await supabase
          .from('catalog_items')
          .select('*')
          .eq('business_slug', slug)

        if (catalogData && !error) {
          setItems(catalogData)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [slug, supabase])

  const tipoNegocio = business?.['Tipo de Negocio']?.toLowerCase() || business?.tipo_de_negocio?.toLowerCase() || 'restaurante'

  const getCategoriasDisponibles = () => {
    if (['citas', 'barberia', 'salon', 'spa', 'clinica', 'consultorio', 'taller'].includes(tipoNegocio)) {
      return ['Servicios', 'Cortes', 'Tratamientos', 'Paquetes', 'Productos']
    } else if (['tienda', 'boutique', 'ecommerce', 'comercio', 'papeleria'].includes(tipoNegocio)) {
      return ['General', 'Accesorios', 'Ropa', 'Artículos']
    } else if (['inmobiliaria', 'bienes_raices'].includes(tipoNegocio)) {
      return ['Renta', 'Venta', 'Terrenos', 'Comercial']
    } else {
      return ['Comida', 'Bebidas', 'Postres', 'Entradas', 'Extras']
    }
  }

  const categoriasPermitidas = getCategoriasDisponibles()

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({ nombre: '', categoria: categoriasPermitidas[0], precio: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingId(item.id)
    setFormData({ nombre: item.nombre, categoria: item.categoria, precio: item.precio })
    setIsModalOpen(true)
  }

  // 2. Guardar (Crear o Editar) en Supabase con el error detallado
  const handleSave = async () => {
    const precioFinal = formData.precio === '' ? 0 : Number(formData.precio)

    if (editingId) {
      // ACTUALIZAR EN SUPABASE
      const { error } = await supabase
        .from('catalog_items')
        .update({
          nombre: formData.nombre,
          categoria: formData.categoria,
          precio: precioFinal
        })
        .eq('id', editingId)

      if (!error) {
        setItems(items.map(item =>
          item.id === editingId
            ? { ...item, nombre: formData.nombre, categoria: formData.categoria, precio: precioFinal }
            : item
        ))
      } else {
        alert('Error al actualizar: ' + error.message)
      }
    } else {
      // INSERTAR NUEVO EN SUPABASE
      const newItemData = {
        business_slug: slug,
        nombre: formData.nombre,
        categoria: formData.categoria || categoriasPermitidas[0],
        precio: precioFinal,
        disponible: true
      }

      const { data, error } = await supabase
        .from('catalog_items')
        .insert([newItemData])
        .select()

      if (data && !error) {
        setItems([...items, data[0]])
      } else {
        alert('Error de Supabase: ' + error?.message)
      }
    }
    setIsModalOpen(false)
  }

  // 3. Cambiar disponibilidad
  const toggleDisponibilidad = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual

    const { error } = await supabase
      .from('catalog_items')
      .update({ disponible: nuevoEstado })
      .eq('id', id)

    if (!error) {
      setItems(items.map(item => 
        item.id === id ? { ...item, disponible: nuevoEstado } : item
      ))
    }
  }

  const itemsFiltrados = items.filter(item => 
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={{ color: '#fff', maxWidth: '1000px', margin: '0 auto' }}>
      
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Catálogo y Precios</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Adaptado automáticamente para: <strong style={{ color: '#3b82f6', textTransform: 'capitalize' }}>{tipoNegocio}</strong>
          </p>
        </div>
        
        <button onClick={handleOpenAdd} style={{
          background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.2rem',
          borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center'
        }}>
          <span>+</span> Agregar Nuevo
        </button>
      </header>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar producto o servicio..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #374151', background: '#111827', color: '#fff', outline: 'none' }}
        />
      </div>

      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '0.75rem', overflow: 'hidden' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', padding: '1rem', background: '#1f2937', color: '#9ca3af', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
          <span>Nombre</span>
          <span>Categoría</span>
          <span>Precio</span>
          <span style={{ textAlign: 'right' }}>Acciones</span>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Cargando catálogo desde la base de datos...</div>
          ) : (
            itemsFiltrados.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', padding: '1rem', borderBottom: '1px solid #1f2937', alignItems: 'center' }}>
                
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.nombre}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{item.categoria}</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>${item.precio}</span>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => handleOpenEdit(item)}
                    style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Editar
                  </button>
                  
                  <button onClick={() => toggleDisponibilidad(item.id, item.disponible)}
                    style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: item.disponible ? '#10b981' : '#4b5563', position: 'relative' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: item.disponible ? '20px' : '2px', transition: 'left 0.3s' }} />
                  </button>
                </div>
              </motion.div>
            ))
          )}

          {!loading && itemsFiltrados.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
              No hay artículos registrados todavía. ¡Agrega el primero!
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#1f2937', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', border: '1px solid #374151' }}>
              
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>
                {editingId ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Nombre</label>
                  <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #374151', background: '#111827', color: '#fff', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Categoría</label>
                  <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #374151', background: '#111827', color: '#fff', outline: 'none' }}>
                    {categoriasPermitidas.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Precio ($)</label>
                  <input 
                    type="number" 
                    value={formData.precio} 
                    placeholder="Ej. 150"
                    onChange={e => setFormData({...formData, precio: e.target.value === '' ? '' : Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #374151', background: '#111827', color: '#fff', outline: 'none' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #374151', padding: '0.6rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  )
}