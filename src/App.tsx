import { useState } from 'react'
import { Search, ShoppingBasket, TrendingDown } from 'lucide-react'
import { supabase } from './lib/supabase'

interface Product {
  id: string
  name: string
  brand: string
  image_url: string
  category: string
  prices: Price[]
}

interface Price {
  supermarket: { name: string }
  price: number
  normalized_price: number
  unit_amount: number
  unit_type: string
  last_updated: string
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (val: string) => {
    setQuery(val)
    if (val.length < 3) {
      setResults([])
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('comparison_products')
      .select(`
        id, name, brand, image_url, category,
        prices:product_prices (
          price, normalized_price, unit_amount, unit_type, last_updated,
          supermarket:supermarket_retailers ( name )
        )
      `)
      .ilike('name', `%${val}%`)
      .limit(10)

    if (error) {
      console.error('Error searching:', error)
    } else {
      setResults(data as any)
    }
    setLoading(false)
  }

  const getBestPrice = (prices: Price[]) => {
    if (!prices || prices.length === 0) return null
    return prices.reduce((prev, curr) =>
      (prev.normalized_price < curr.normalized_price) ? prev : curr
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <ShoppingBasket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter">SúperNi</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <a href="#" className="text-xs font-semibold uppercase tracking-widest text-black/40 hover:text-black transition-colors">Buscador</a>
            <a href="#" className="text-xs font-semibold uppercase tracking-widest text-black/40 hover:text-black transition-colors">Favoritos</a>
            <a href="#" className="text-xs font-semibold uppercase tracking-widest text-black/40 hover:text-black transition-colors">Tendencias</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-black mb-6 tracking-tight">
            Transparencia en cada estante.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
            Compara precios entre Walmart, La Colonia y más en un diseño hecho para la eficiencia.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Busca un producto..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-gray-200 focus:outline-none transition-all text-xl placeholder:text-gray-300"
            />
          </div>
          {loading && <p className="text-center mt-4 text-xs text-gray-400 animate-pulse uppercase tracking-widest font-bold">Buscando...</p>}
        </div>

        {/* Results List */}
        <div className="space-y-12">
          {results.map((product: Product) => {
            const best = getBestPrice(product.prices)
            return (
              <div key={product.id} className="group border-b border-gray-100 pb-12 transition-opacity">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Image */}
                  <div className="w-40 h-40 bg-gray-50 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center p-4">
                    <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain grayscale-[50%] group-hover:grayscale-0 transition-all" />
                  </div>

                  {/* Info */}
                  <div className="flex-grow space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1 block">{product.brand || 'Marca Propia'}</span>
                      <h3 className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-black transition-colors">{product.name}</h3>
                    </div>

                    {/* Store Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      {product.prices.map((p: Price, idx: number) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${best === p ? 'bg-black border-black text-white shadow-xl shadow-black/10' : 'bg-white border-gray-100'} transition-all`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${best === p ? 'text-gray-400' : 'text-gray-500'}`}>{p.supermarket.name}</span>
                            {best === p && (
                              <span className="bg-white text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> MEJOR OPCIÓN
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black">C$ {p.price}</span>
                          </div>
                          <p className={`text-[11px] mt-2 font-medium ${best === p ? 'text-gray-500' : 'text-gray-400'}`}>
                            Envase de {p.unit_amount}{p.unit_type} • Aprox. C${(p.normalized_price * 100).toFixed(2)} / 100g
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {results.length === 0 && !loading && query.length > 2 && (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-gray-400 font-medium">No encontramos productos con ese nombre.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-20 border-t border-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <ShoppingBasket className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tighter uppercase">SúperNi</span>
            </div>
            <p className="text-xs text-gray-400 font-medium italic">Datos actualizados cada 24 horas.</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Proyecto</h4>
              <ul className="text-xs text-gray-400 space-y-2 font-medium">
                <li><a href="#" className="hover:text-black">Acerca de</a></li>
                <li><a href="#" className="hover:text-black">API</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Social</h4>
              <ul className="text-xs text-gray-400 space-y-2 font-medium">
                <li><a href="#" className="hover:text-black">GitHub</a></li>
                <li><a href="#" className="hover:text-black">Twitter</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
