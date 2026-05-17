import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  ChevronRight, 
  Coffee, 
  Utensils, 
  Star,
  ArrowLeft,
  CheckCircle2,
  Moon,
  Sun,
  Phone,
  ShoppingBag,
  QrCode,
  ChevronDown,
  BarChart3,
  ClipboardList,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';

// --- Types ---
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  tableNumber: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  timestamp: number;
  paymentMethod?: string;
}

// --- Mock Data ---
const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'Velvet Espresso', description: 'Double-shot of our signature house blend with a creamy, honey-like crema.', price: 5.50, category: 'Coffee', image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '2', name: 'Gold Macchiato', description: 'Silky steamed milk marked with espresso and a drizzle of artisanal caramel.', price: 6.75, category: 'Coffee', image: 'https://images.unsplash.com/photo-1485808191679-5f6333bb210a?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '9', name: 'Emerald Matcha', description: 'Ceremonial grade Uji matcha whisked with creamy oat milk and local honey.', price: 7.50, category: 'Tea', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=600&fit=crop', rating: 4.8 },
  { id: '3', name: 'Artisan Avocado', description: 'Heirloom tomatoes, radical radish, and whipped feta on toasted sourdough.', price: 14.50, category: 'Brunch', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop', rating: 4.7 },
  { id: '5', name: 'Truffle Croissant', description: 'House-made buttery croissant filled with black truffle infused Gruyère.', price: 10.50, category: 'Bakery', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=600&fit=crop', rating: 4.6 },
  { id: '12', name: 'Midnight Lava', description: '70% Dark chocolate fondant with a molten core and gold leaf finish.', price: 12.00, category: 'Desserts', image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '6', name: 'Burrata Pizza', description: 'Creamy burrata, prosciutto di Parma, and aged balsamic glaze.', price: 18.00, category: 'Mains', image: 'https://images.unsplash.com/photo-1574129624542-46c230756539?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '11', name: 'Aurelia Bowl', description: 'Quinoa, roasted seasonal squash, spiced chickpeas, and tahini drizzle.', price: 16.50, category: 'Mains', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop', rating: 4.5 },
];

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Brunch', 'Bakery', 'Mains', 'Desserts'];

export default function App() {
  const [view, setView] = useState<'welcome' | 'menu' | 'cart' | 'checkout' | 'order-success' | 'admin'>('welcome');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [tableNumber, setTableNumber] = useState('');
  const [persons, setPersons] = useState(2);
  const [orders, setOrders] = useState<Order[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>(null);
  const [adminTab, setAdminTab] = useState<'manager' | 'kitchen' | 'waiter' | 'tables'>('manager');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) {
      setTableNumber(table);
      setView('menu');
    }
  }, []);

  useEffect(() => {
    if (view !== 'welcome') setIsCameraActive(false);
  }, [view]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200 && isCameraActive) {
        setIsCameraActive(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCameraActive]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load orders from local storage to persist between views
  useEffect(() => {
    const savedOrders = localStorage.getItem('cafe_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('cafe_orders', JSON.stringify(newOrders));
  };

  const handleScan = (result: string) => {
    if (result) {
      try {
        const url = new URL(result);
        const table = url.searchParams.get('table');
        if (table) {
          setTableNumber(table);
          setView('menu');
        } else {
          setTableNumber(result);
          setView('menu');
        }
      } catch (e) {
        setTableNumber(result);
        setView('menu');
      }
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item && item.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  const placeOrder = () => {
    if (!paymentMethod) return;
    const newOrder: Order & { paymentMethod: string } = {
      id: Math.random().toString(36).substr(2, 9),
      tableNumber: tableNumber || 'Takeaway',
      items: [...cart],
      total: cartTotal,
      status: 'pending',
      timestamp: Date.now(),
      paymentMethod: paymentMethod
    };
    
    saveOrders([newOrder, ...orders]);
    setCart([]);
    setPaymentMethod(null);
    setView('order-success');
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    saveOrders(updatedOrders);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const filteredItems = MENU_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-700 font-sans">
      <AnimatePresence mode="wait">
        
        {/* --- Welcome View --- */}
        {view === 'welcome' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            {/* Nav Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-12 py-5 bg-gradient-to-b from-black/60 to-transparent">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                     <Coffee size={14} className="text-white" />
                  </div>
                  <h1 className="font-serif text-xl md:text-2xl text-white italic font-bold tracking-tight">Aurelia</h1>
               </div>
               <div className="flex items-center gap-6 md:gap-8">
                  <button onClick={toggleTheme} className="text-white/80 hover:text-white transition-colors">
                     {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  </button>
                  <button onClick={() => setView('admin')} className="text-white text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black border-b border-white/20 pb-1">Staff</button>
               </div>
            </nav>

            {/* Full Screen Scanner Hero */}
            <section className="relative h-[100vh] w-full flex flex-col items-center justify-center bg-black overflow-hidden group">
               {/* Background Image (visible when camera is off) */}
               {!isCameraActive && (
                 <>
                   <img 
                     src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop" 
                     alt="Aurelia Cafe" 
                     className="absolute inset-0 w-full h-full object-cover opacity-60"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
                 </>
               )}

               {isCameraActive ? (
                  <div className="absolute inset-0">
                     <Scanner 
                        onScan={(result) => handleScan(result[0].rawValue)}
                        styles={{ container: { width: '100%', height: '100%' } }}
                        components={{ finder: true }}
                     />
                  </div>
               ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer" onClick={() => setIsCameraActive(true)}>
                     <div className="text-center mb-10 mt-10">
                        <h2 className="font-serif text-5xl sm:text-6xl md:text-8xl leading-[1.0] text-white tracking-tighter mb-4 shadow-black drop-shadow-2xl">
                          Aurelia Cafe
                        </h2>
                        <p className="font-serif text-lg md:text-2xl italic text-white/90">Scan to begin your experience.</p>
                     </div>
                     <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] md:rounded-[40px] border border-white/40 flex flex-col items-center justify-center bg-white/10 backdrop-blur-xl hover:bg-white/20 hover:scale-110 transition-all shadow-[0_0_80px_rgba(255,255,255,0.15)] ring-1 ring-white/20">
                       <QrCode className="w-10 h-10 md:w-16 md:h-16 text-white mb-2 md:mb-3 opacity-90" />
                       <span className="text-white text-[10px] md:text-xs uppercase tracking-[0.3em] font-black">Tap to Scan</span>
                     </div>
                  </div>
               )}

               {/* Scroll Indicator */}
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60 animate-bounce cursor-pointer z-10" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                  <span className="text-[9px] uppercase tracking-widest mb-1 font-bold">Manual Entry</span>
                  <ChevronDown size={16} />
               </div>
            </section>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-20 py-24 w-full">
               {/* Reservation/Table Widget */}
               <div className="card p-6 sm:p-10 md:p-16 bg-white dark:bg-[#1a1a1a] border-none shadow-[0_30px_60px_rgba(0,0,0,0.1)] md:shadow-[0_50px_100px_rgba(0,0,0,0.1)] mb-16 md:mb-24 rounded-[32px] md:rounded-[60px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4">
                    <div>
                      <h3 className="font-serif text-2xl sm:text-4xl mb-1 md:mb-2 italic tracking-tight">Manual Table Entry</h3>
                      <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] uppercase tracking-[0.4em] font-black">If QR scanning is unavailable</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                    <div className="flex flex-col gap-3">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] font-black ml-1">Table Number</label>
                      <input 
                        type="text"
                        placeholder="00"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full font-serif text-2xl sm:text-3xl pb-3 md:pb-4 border-b-2 border-[var(--secondary)] bg-transparent focus:outline-none text-[var(--text-main)] placeholder:text-gray-200"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] font-black ml-1">Persons</label>
                      <div className="flex items-center justify-between pb-3 md:pb-4 border-b-2 border-[var(--primary)]/5">
                        <div className="flex items-center gap-6">
                           <button onClick={() => setPersons(Math.max(1, persons - 1))} className="w-8 h-8 rounded-full border border-[var(--primary)]/10 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--secondary)] transition-colors"><Minus size={14} /></button>
                           <span className="font-serif text-2xl sm:text-3xl">{String(persons).padStart(2, '0')}</span>
                           <button onClick={() => setPersons(persons + 1)} className="w-8 h-8 rounded-full border border-[var(--primary)]/10 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--secondary)] transition-colors"><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end mt-4 md:mt-0">
                      <button 
                        onClick={() => tableNumber && setView('menu')}
                        className="w-full btn bg-near-black text-white py-5 md:py-6 shadow-2xl hover:bg-[var(--secondary)] transition-all"
                        disabled={!tableNumber}
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
               </div>

               {/* Property Highlights */}
               <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 sm:gap-20 text-center mb-20 md:mb-32">
                  {[
                    { icon: QrCode, title: 'Scan & Order', desc: 'Instant access from your table' },
                    { icon: Phone, title: 'Cash or Digital', desc: 'Flexible payment options' },
                    { icon: Utensils, title: 'Prepared Fresh', desc: 'Our kitchen crafts your order' },
                    { icon: CheckCircle2, title: 'Delivered', desc: 'Waiters bring it directly to you' }
                  ].map((item, idx) => (
                    <motion.div 
                       key={idx} 
                       className="space-y-4 md:space-y-6 group bg-white/50 md:bg-transparent p-6 md:p-0 rounded-3xl"
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: idx * 0.1 }}
                    >
                       <div className="flex justify-center transition-transform group-hover:-translate-y-3 duration-500">
                          <item.icon strokeWidth={0.5} className="w-12 h-12 md:w-14 md:h-14 text-[var(--secondary)]" />
                       </div>
                       <h4 className="text-xl md:text-2xl font-serif italic">{item.title}</h4>
                       <p className="text-[9px] md:text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.1em] leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
               </section>
            </main>
          </motion.div>
        )}

        {/* Removed Modal Scanner */}

        {/* --- Menu View --- */}
        {view === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-32"
          >
            {/* Premium Header */}
            <div className="sticky top-0 z-40 glass border-b border-[var(--primary)]/5 px-5 py-4 md:px-12 md:py-6">
               <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                     <div className="w-8 h-8 md:w-10 md:h-10 bg-[var(--primary)] text-white rounded-full flex items-center justify-center shadow-lg">
                        <Coffee size={16} className="md:w-5 md:h-5" />
                     </div>
                     <div>
                        <h2 className="text-lg md:text-xl font-black italic font-serif">Aurelia</h2>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-bold text-[var(--secondary)]">Table {tableNumber}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                     <button onClick={toggleTheme} className="p-2 hover:bg-[var(--primary)]/5 rounded-full transition-colors">
                        {theme === 'light' ? <Moon size={16} className="md:w-[18px] md:h-[18px]" /> : <Sun size={16} className="md:w-[18px] md:h-[18px]" />}
                     </button>
                     <button onClick={() => setView('welcome')} className="p-2 hover:bg-[var(--primary)]/5 rounded-full transition-colors">
                        <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                     </button>
                  </div>
               </div>
            </div>

            <div className="max-w-7xl mx-auto px-5 md:px-6 pt-8 md:pt-12">
               <div className="mb-10 md:mb-16 text-center md:text-left">
                  <h3 className="text-4xl md:text-7xl font-black italic font-serif mb-3 md:mb-4 leading-tight tracking-tight">Curated<br className="hidden md:block"/><span className="gold-gradient"> Indulgences</span></h3>
                  <p className="text-[var(--text-muted)] text-sm md:text-lg max-w-lg font-medium mx-auto md:mx-0">From sun-drenched roasts to artisanal small plates, discover the essence of Aurelia.</p>
               </div>

               <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mb-8 md:mb-12 snap-x">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`snap-start whitespace-nowrap px-6 py-3 md:px-10 md:py-4 rounded-full text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black transition-all border ${
                        activeCategory === cat 
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xl' 
                          : 'bg-white text-[var(--text-muted)] border-[var(--primary)]/5 hover:border-[var(--primary)] shadow-sm'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
               </div>

               <div className="relative mb-12 md:mb-20">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5 md:w-6 md:h-6" />
                  <input 
                    type="text" 
                    placeholder="Seeking something specific?"
                    className="w-full py-5 md:py-7 pl-14 md:pl-16 pr-8 bg-white rounded-3xl md:rounded-[32px] shadow-soft border-2 border-transparent focus:border-[var(--secondary)] focus:outline-none transition-all text-lg md:text-xl italic font-serif"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                  {filteredItems.map(item => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="group card overflow-hidden p-0 flex flex-col hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-700 rounded-3xl"
                    >
                      <div className="relative h-64 md:h-80 overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                        />
                        <div className="absolute top-4 right-4 glass px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase flex items-center gap-1.5 md:gap-2">
                           <Star size={10} className="md:w-3 md:h-3 text-[var(--secondary)] fill-current" /> {item.rating}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 hidden md:block" />
                        <button 
                          onClick={() => addToCart(item)}
                          className="absolute bottom-6 right-6 w-12 h-12 md:bottom-8 md:right-8 md:w-16 md:h-16 bg-white text-[var(--primary)] rounded-full shadow-2xl flex items-center justify-center md:opacity-0 md:translate-y-6 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 hover:bg-[var(--secondary)] hover:text-white"
                        >
                          <Plus size={24} className="md:w-8 md:h-8" />
                        </button>
                      </div>
                      <div className="p-6 md:p-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-baseline mb-3 md:mb-4">
                           <h4 className="text-2xl md:text-3xl font-black font-serif italic tracking-tight">{item.name}</h4>
                           <span className="text-lg md:text-xl font-black gold-gradient">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-sm md:text-base text-[var(--text-muted)] font-medium leading-relaxed opacity-80 mb-6 md:mb-8">{item.description}</p>
                        <div className="mt-auto flex items-center justify-between">
                           <span className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-black text-[var(--secondary)] px-3 py-1 md:px-4 md:py-1.5 bg-[var(--secondary)]/10 rounded-full">{item.category}</span>
                           <button onClick={() => addToCart(item)} className="md:hidden font-black text-[9px] uppercase tracking-widest text-white bg-near-black px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform">Add</button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {/* --- Cart View --- */}
        {view === 'cart' && (
          <motion.div 
            key="cart"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 bg-[var(--bg-primary)] z-50 overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12 pb-48 md:pb-48">
               <div className="flex items-center justify-between mb-12 md:mb-24">
                  <button onClick={() => setView('menu')} className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[var(--primary)]/10 flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm">
                     <ArrowLeft size={20} className="md:w-6 md:h-6" />
                  </button>
                  <h2 className="text-3xl md:text-5xl font-black italic font-serif tracking-tight">Your Selection</h2>
                  <div className="w-12 md:w-14" />
               </div>

               {cart.length === 0 ? (
                 <div className="text-center py-20">
                    <ShoppingBag size={64} className="md:w-[80px] md:h-[80px] mx-auto text-[var(--primary)]/5 mb-8 md:mb-10" />
                    <p className="text-2xl md:text-3xl font-serif italic text-[var(--text-muted)]">The silver tray awaits its first delight.</p>
                    <button onClick={() => setView('menu')} className="mt-12 md:mt-16 btn bg-near-black text-white px-10 py-5 md:px-12 md:py-6">Return to Collection</button>
                 </div>
               ) : (
                 <div className="space-y-6 md:space-y-10">
                    {cart.map(item => (
                      <div key={item.id} className="card p-4 md:p-8 flex flex-col sm:flex-row items-center gap-6 md:gap-10 shadow-lg border-none">
                         <img src={item.image} className="w-full sm:w-32 h-48 sm:h-32 object-cover rounded-2xl md:rounded-3xl shadow-md md:shadow-xl" />
                         <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                            <h5 className="text-xl md:text-2xl font-black font-serif italic mb-1 md:mb-2 tracking-tight">{item.name}</h5>
                            <p className="text-lg md:text-xl text-[var(--secondary)] font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                         <div className="flex items-center gap-4 md:gap-6 bg-[var(--bg-secondary)] rounded-full px-4 py-2 md:px-6 md:py-3 border border-black/5 w-full sm:w-auto justify-between sm:justify-center">
                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Minus size={16} className="md:w-5 md:h-5" /></button>
                            <span className="text-lg md:text-xl font-black tabular-nums">{item.quantity}</span>
                            <button onClick={() => addToCart(item)} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Plus size={16} className="md:w-5 md:h-5" /></button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            {cart.length > 0 && (
               <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 glass border-t border-black/5 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
                     <div className="flex items-center justify-between w-full md:w-auto md:block text-center md:text-left">
                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-black text-[var(--text-muted)] mb-1 md:mb-3 block">Consolidated Total</span>
                        <span className="text-4xl md:text-6xl font-black gold-gradient tracking-tighter">${cartTotal.toFixed(2)}</span>
                     </div>
                     <button 
                        onClick={() => setView('checkout')}
                        className="w-full md:w-auto btn bg-near-black text-white px-10 md:px-20 py-5 md:py-7 text-xs md:text-sm tracking-[0.3em] shadow-2xl hover:bg-[var(--secondary)]"
                     >
                        Proceed to Checkout
                     </button>
                  </div>
               </div>
            )}
          </motion.div>
        )}

        {/* --- Checkout View (Payment Selection) --- */}
        {view === 'checkout' && (
          <motion.div 
            key="checkout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 bg-[var(--bg-primary)] z-50 overflow-y-auto"
          >
             <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-12 pb-32">
                <div className="flex items-center justify-between mb-10 md:mb-16">
                   <button onClick={() => setView('cart')} className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[var(--primary)]/10 flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm">
                      <ArrowLeft size={20} className="md:w-6 md:h-6" />
                   </button>
                   <h2 className="text-3xl md:text-4xl font-black italic font-serif tracking-tight">Payment</h2>
                   <div className="w-12 md:w-14" />
                </div>

                <div className="card p-6 md:p-12 bg-white shadow-2xl rounded-[32px] md:rounded-[40px] mb-8 md:mb-12">
                   <h3 className="text-xl md:text-2xl font-serif italic mb-6 md:mb-8 text-center md:text-left">How would you like to settle?</h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
                      <button 
                         onClick={() => setPaymentMethod('online')}
                         className={`p-6 md:p-8 border-2 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 md:gap-4 transition-all ${paymentMethod === 'online' ? 'border-[var(--secondary)] bg-[var(--secondary)]/5' : 'border-black/5 hover:border-black/20'}`}
                      >
                         <QrCode size={40} className={`md:w-[48px] md:h-[48px] ${paymentMethod === 'online' ? 'text-[var(--secondary)]' : 'text-gray-400'}`} />
                         <span className="font-bold text-base md:text-lg">Pay Online</span>
                         <span className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-widest">Card / UPI</span>
                      </button>

                      <button 
                         onClick={() => setPaymentMethod('cash')}
                         className={`p-6 md:p-8 border-2 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-3 md:gap-4 transition-all ${paymentMethod === 'cash' ? 'border-[var(--secondary)] bg-[var(--secondary)]/5' : 'border-black/5 hover:border-black/20'}`}
                      >
                         <Coffee size={40} className={`md:w-[48px] md:h-[48px] ${paymentMethod === 'cash' ? 'text-[var(--secondary)]' : 'text-gray-400'}`} />
                         <span className="font-bold text-base md:text-lg">Pay by Cash</span>
                         <span className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-widest">At Table</span>
                      </button>
                   </div>

                   {paymentMethod === 'online' && (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 md:mb-8 p-4 md:p-6 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-200">
                        <div className="text-center">
                           <QRCodeSVG value="upi://pay?pa=aurelia@bank" size={120} className="md:w-[150px] md:h-[150px] mx-auto mb-4" />
                           <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Scan to Pay ${cartTotal.toFixed(2)}</p>
                        </div>
                     </motion.div>
                   )}

                   <button 
                      onClick={placeOrder}
                      disabled={!paymentMethod}
                      className="w-full btn bg-near-black text-white py-5 md:py-6 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      Confirm Order
                   </button>
                </div>
             </div>
          </motion.div>
        )}

        {/* --- Success View --- */}
        {view === 'order-success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 md:p-8 text-center bg-[var(--bg-primary)]"
          >
            <motion.div 
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: 'spring', damping: 12 }}
               className="w-32 h-32 md:w-40 md:h-40 bg-[var(--secondary)] text-white rounded-full flex items-center justify-center mb-10 md:mb-16 shadow-2xl shadow-[var(--secondary)]/20"
            >
               <CheckCircle2 size={64} className="md:w-[80px] md:h-[80px]" />
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-black italic font-serif mb-6 md:mb-8 leading-tight tracking-tighter">Order Sent<br/>to Kitchen</h2>
            <p className="text-base md:text-xl text-[var(--text-muted)] max-w-md mb-10 md:mb-16 font-medium leading-relaxed px-4">Your order is now being prepared. We will deliver it to Table {tableNumber} as soon as it's ready.</p>
            <button 
              onClick={() => setView('menu')}
              className="btn bg-near-black text-white px-12 md:px-20 py-5 md:py-6 w-full sm:w-auto"
            >
              Back to Menu
            </button>
          </motion.div>
        )}

        {/* --- Staff Dashboard (Kitchen, Waiter & Tables) --- */}
        {view === 'admin' && (
          <motion.div 
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 md:p-10 lg:p-20 max-w-7xl mx-auto"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between mb-10 md:mb-16 border-b border-black/5 pb-8 md:pb-12 gap-6 md:gap-8">
               <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto justify-between lg:justify-start">
                 <button onClick={() => setView('welcome')} className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-black/10 flex items-center justify-center hover:bg-near-black hover:text-white transition-all"><ArrowLeft size={20} className="md:w-6 md:h-6" /></button>
                 <h2 className="text-3xl md:text-5xl font-black italic font-serif tracking-tight">Staff Terminal</h2>
               </div>
               
               {/* Dashboard Tabs (Desktop Only) */}
               <div className="hidden md:flex flex-wrap justify-center gap-2 bg-white rounded-full shadow-sm border border-black/5 p-2 w-full lg:w-auto">
                 <button onClick={() => setAdminTab('manager')} className={`px-8 py-3 rounded-full text-xs uppercase tracking-widest font-black transition-all ${adminTab === 'manager' ? 'bg-near-black text-white' : 'text-gray-500 hover:text-near-black'}`}>Manager</button>
                 <button onClick={() => setAdminTab('kitchen')} className={`px-8 py-3 rounded-full text-xs uppercase tracking-widest font-black transition-all ${adminTab === 'kitchen' ? 'bg-near-black text-white' : 'text-gray-500 hover:text-near-black'}`}>Kitchen</button>
                 <button onClick={() => setAdminTab('waiter')} className={`px-8 py-3 rounded-full text-xs uppercase tracking-widest font-black transition-all ${adminTab === 'waiter' ? 'bg-near-black text-white' : 'text-gray-500 hover:text-near-black'}`}>Waitstaff</button>
                 <button onClick={() => setAdminTab('tables')} className={`px-8 py-3 rounded-full text-xs uppercase tracking-widest font-black transition-all ${adminTab === 'tables' ? 'bg-[var(--secondary)] text-white' : 'text-gray-500 hover:text-[var(--secondary)]'}`}>QR Gen</button>
               </div>
            </div>

            {adminTab === 'manager' ? (
               <div className="pb-24">
                  <h3 className="text-2xl md:text-3xl font-serif italic mb-6">Today's Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
                     <div className="card p-6 bg-white shadow-xl rounded-3xl border border-black/5">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-2">Revenue</p>
                        <p className="text-3xl font-serif italic text-near-black">${orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0).toFixed(2)}</p>
                     </div>
                     <div className="card p-6 bg-white shadow-xl rounded-3xl border border-black/5">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-2">Total Orders</p>
                        <p className="text-3xl font-serif italic text-near-black">{orders.length}</p>
                     </div>
                     <div className="card p-6 bg-white shadow-xl rounded-3xl border border-black/5">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-2">Active Tables</p>
                        <p className="text-3xl font-serif italic text-near-black">{new Set(orders.filter(o => o.status !== 'delivered').map(o => o.tableNumber)).size}</p>
                     </div>
                     <div className="card p-6 bg-[var(--secondary)] text-white shadow-xl rounded-3xl">
                        <p className="text-[10px] uppercase tracking-widest text-white/80 font-black mb-2">Status</p>
                        <p className="text-3xl font-serif italic">Online</p>
                     </div>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-serif italic mb-6">Recent Activity</h3>
                  <div className="bg-white rounded-[32px] p-6 shadow-xl border border-black/5">
                     {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex justify-between items-center py-4 border-b border-black/5 last:border-0">
                           <div>
                              <p className="font-serif text-lg">Table {order.tableNumber}</p>
                              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                           </div>
                           <div className="text-right">
                              <p className="font-bold">${order.total.toFixed(2)}</p>
                              <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                 {order.status}
                              </span>
                           </div>
                        </div>
                     ))}
                     {orders.length === 0 && <p className="text-[var(--text-muted)] text-center py-10">No activity yet today.</p>}
                  </div>
               </div>
            ) : adminTab === 'tables' ? (
               <div className="max-w-2xl mx-auto text-center px-4 md:px-0">
                  <h3 className="text-2xl md:text-3xl font-serif italic mb-3 md:mb-4">Table QR Generation</h3>
                  <p className="text-sm md:text-base text-[var(--text-muted)] mb-8 md:mb-12">Enter a table number below to generate its unique QR code. Print these codes and place them on your tables.</p>
                  
                  <div className="card p-8 md:p-12 bg-white shadow-2xl rounded-[32px] md:rounded-[40px] border border-black/5 relative overflow-hidden flex flex-col items-center">
                     <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[var(--secondary)] to-near-black" />
                     
                     <div className="mb-8 md:mb-10 w-full max-w-xs">
                       <label className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] font-black mb-2 md:mb-3 block">Enter Table Number</label>
                       <input 
                         type="text" 
                         placeholder="e.g., 12 or Patio-3"
                         value={tableNumber} 
                         onChange={(e) => setTableNumber(e.target.value)}
                         className="w-full text-center font-serif text-2xl md:text-3xl pb-3 md:pb-4 border-b-2 border-[var(--secondary)] bg-transparent focus:outline-none"
                       />
                     </div>
                     
                     <div className="bg-[var(--bg-primary)] p-6 md:p-10 rounded-3xl md:rounded-[32px] border border-black/5 mb-6 md:mb-8 inline-block shadow-inner">
                        <QRCodeSVG 
                           value={tableNumber ? `${window.location.origin}?table=${tableNumber}` : `${window.location.origin}`} 
                           size={200} 
                           className="md:w-[250px] md:h-[250px]"
                           fgColor="var(--primary)" 
                           bgColor="transparent" 
                        />
                     </div>
                     <p className="text-3xl md:text-4xl font-black font-serif italic mb-2 md:mb-3 tracking-tight">
                        {tableNumber ? `Table ${tableNumber}` : 'Enter a table...'}
                     </p>
                     <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)] mb-6 md:mb-8 font-black">Aurelia Coffee House</p>
                     
                     <button onClick={() => window.print()} className="btn bg-near-black text-white py-4 md:py-5 text-[9px] md:text-[10px] tracking-[0.3em] shadow-xl w-full max-w-xs">
                        Print QR Code
                     </button>
                  </div>
               </div>
            ) : (
               <div className="space-y-6 md:space-y-12">
                  {orders.filter(o => 
                    adminTab === 'kitchen' ? ['pending', 'preparing'].includes(o.status) 
                    : ['ready', 'delivered'].includes(o.status)
                  ).length === 0 ? (
                    <div className="py-20 md:py-32 text-center border-4 border-dashed border-black/5 rounded-3xl md:rounded-[40px]">
                       <p className="text-[var(--text-muted)] italic text-xl md:text-2xl font-serif px-6">No active tasks in this queue.</p>
                    </div>
                  ) : (
                    orders.filter(o => 
                      adminTab === 'kitchen' ? ['pending', 'preparing'].includes(o.status) 
                      : ['ready', 'delivered'].includes(o.status)
                    ).map(order => (
                      <motion.div layout key={order.id} className="card p-6 md:p-12 flex flex-col md:flex-row gap-6 md:gap-12 shadow-xl border-none relative overflow-hidden rounded-3xl md:rounded-[40px]">
                         {order.status === 'delivered' && <div className="absolute inset-0 bg-white/60 z-10 pointer-events-none" />}
                         <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-6 md:mb-10 border-b border-black/5 pb-4 md:pb-0 md:border-none">
                               <span className="text-4xl md:text-5xl font-black italic font-serif tracking-tight">Table {order.tableNumber}</span>
                               <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                 <span className={`px-4 py-1.5 md:px-5 md:py-2 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] rounded-full ${order.status === 'pending' ? 'bg-red-500' : order.status === 'preparing' ? 'bg-orange-500' : order.status === 'ready' ? 'bg-green-500' : 'bg-gray-400'}`}>
                                   {order.status}
                                 </span>
                                 <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest border border-gray-200 px-3 py-1 md:py-1.5 rounded-full">
                                   Pay: {order.paymentMethod}
                                 </span>
                               </div>
                            </div>
                            <div className="space-y-4 md:space-y-6">
                               {order.items.map(i => (
                                 <div key={i.id} className="flex justify-between items-center text-base md:text-lg font-bold border-b border-black/5 pb-3 md:pb-4">
                                    <span className="font-serif italic pr-4"><span className="text-[var(--secondary)] text-xs md:text-sm font-black mr-2 not-italic">{i.quantity}x</span> {i.name}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                         <div className="md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-black/5 pt-6 md:pt-0 md:pl-12 mt-4 md:mt-0">
                            <div className="flex flex-row md:flex-col justify-between items-center md:items-start mb-6 md:mb-0">
                               <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text-muted)] block mb-0 md:mb-2">Order Total</span>
                               <span className="text-3xl md:text-4xl font-black gold-gradient tracking-tighter">${order.total.toFixed(2)}</span>
                            </div>
                            
                            {/* Action Buttons based on status */}
                            <div className="flex flex-col gap-3">
                               {order.status === 'pending' && adminTab === 'kitchen' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="btn bg-orange-500 text-white py-4 md:py-5 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-lg">Start Preparing</button>
                               )}
                               {order.status === 'preparing' && adminTab === 'kitchen' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'ready')} className="btn bg-green-500 text-white py-4 md:py-5 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-lg">Mark as Ready</button>
                               )}
                               {order.status === 'ready' && adminTab === 'waiter' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="btn bg-blue-500 text-white py-4 md:py-5 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-lg">Mark Delivered</button>
                               )}
                               {order.status === 'delivered' && (
                                 <span className="text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 py-3 rounded-xl">Completed</span>
                               )}
                            </div>
                         </div>
                      </motion.div>
                    ))
                  )}
               </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* --- Floating Global Tray Pod (Desktop Only) --- */}
      {view === 'menu' && cart.length > 0 && (
        <div className="hidden md:flex fixed bottom-12 left-0 w-full justify-center z-[100]">
          <motion.button
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView('cart')}
            className="w-full md:w-auto max-w-[360px] md:max-w-none glass px-6 py-4 md:px-12 md:py-7 rounded-[28px] md:rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex items-center justify-between md:justify-start md:gap-10 border border-white/40"
          >
            <div className="flex items-center gap-4 md:gap-10">
               <div className="relative">
                 <ShoppingBag size={24} className="md:w-8 md:h-8 text-near-black" />
                 <span className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-[var(--secondary)] text-white w-6 h-6 md:w-8 md:h-8 rounded-full text-[9px] md:text-[11px] flex items-center justify-center font-black border-2 md:border-4 border-white">
                   {cart.reduce((s, i) => s + i.quantity, 0)}
                 </span>
               </div>
               <div className="hidden md:block h-10 w-[2px] bg-black/5" />
               <div className="flex flex-col items-start leading-none">
                 <span className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-black text-[var(--text-muted)] mb-1.5 md:mb-2 block">Your Tray</span>
                 <span className="text-xl md:text-3xl font-black italic font-serif tracking-tight">${cartTotal.toFixed(2)}</span>
               </div>
            </div>
            <div className="w-10 h-10 md:w-auto md:h-auto rounded-full bg-[var(--primary)]/5 md:bg-transparent flex items-center justify-center">
               <ChevronRight size={20} className="md:w-6 md:h-6 text-[var(--secondary)] md:opacity-40" />
            </div>
          </motion.button>
        </div>
      )}
      {/* --- Android Style Bottom Nav for Guests --- */}
      {['menu', 'cart', 'order-success'].includes(view) && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-[#1a1a1a] border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100] pb-safe">
           <div className="flex justify-around items-center h-16">
              <button onClick={() => setView('menu')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'menu' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <Coffee size={20} className="mb-1" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
              </button>
              <button onClick={() => setView('cart')} className={`flex flex-col items-center justify-center w-full h-full relative ${view === 'cart' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <ShoppingBag size={20} className="mb-1" />
                 {cart.length > 0 && <span className="absolute top-2 right-6 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
                 <span className="text-[9px] font-black uppercase tracking-widest">Tray</span>
              </button>
              <button onClick={() => setView('admin')} className="flex flex-col items-center justify-center w-full h-full text-[var(--text-muted)]">
                 <LayoutGrid size={20} className="mb-1" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Staff</span>
              </button>
           </div>
        </div>
      )}

      {/* --- Android Style Bottom Nav for Staff --- */}
      {view === 'admin' && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-[#1a1a1a] border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100] pb-safe">
           <div className="flex justify-around items-center h-16">
              <button onClick={() => setAdminTab('manager')} className={`flex flex-col items-center justify-center w-full h-full ${adminTab === 'manager' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <BarChart3 size={20} className="mb-1" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Manager</span>
              </button>
              <button onClick={() => setAdminTab('kitchen')} className={`flex flex-col items-center justify-center w-full h-full ${adminTab === 'kitchen' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <Utensils size={20} className="mb-1" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Kitchen</span>
              </button>
              <button onClick={() => setAdminTab('waiter')} className={`flex flex-col items-center justify-center w-full h-full ${adminTab === 'waiter' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <ClipboardList size={20} className="mb-1" />
                 <span className="text-[8px] font-black uppercase tracking-widest">Waiter</span>
              </button>
              <button onClick={() => setAdminTab('tables')} className={`flex flex-col items-center justify-center w-full h-full ${adminTab === 'tables' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                 <QrCode size={20} className="mb-1" />
                 <span className="text-[8px] font-black uppercase tracking-widest">QR Gen</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
