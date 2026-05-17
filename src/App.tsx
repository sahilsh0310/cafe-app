import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
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
import { io } from 'socket.io-client';

const socketURL = import.meta.env.DEV ? `http://${window.location.hostname}:3001` : undefined;
const socket = io(socketURL);

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
  { id: '1', name: 'Velvet Espresso', description: 'Double-shot of our signature house blend with a creamy, honey-like crema.', price: 450, category: 'Coffee', image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '2', name: 'Gold Macchiato', description: 'Silky steamed milk marked with espresso and a drizzle of artisanal caramel.', price: 540, category: 'Coffee', image: 'https://images.unsplash.com/photo-1485808191679-5f6333bb210a?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '9', name: 'Emerald Matcha', description: 'Ceremonial grade Uji matcha whisked with creamy oat milk and local honey.', price: 600, category: 'Tea', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=600&fit=crop', rating: 4.8 },
  { id: '3', name: 'Artisan Avocado', description: 'Heirloom tomatoes, radical radish, and whipped feta on toasted sourdough.', price: 1150, category: 'Brunch', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop', rating: 4.7 },
  { id: '5', name: 'Truffle Croissant', description: 'House-made buttery croissant filled with black truffle infused Gruyère.', price: 840, category: 'Bakery', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=600&fit=crop', rating: 4.6 },
  { id: '12', name: 'Midnight Lava', description: '70% Dark chocolate fondant with a molten core and gold leaf finish.', price: 960, category: 'Desserts', image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '6', name: 'Burrata Pizza', description: 'Creamy burrata, prosciutto di Parma, and aged balsamic glaze.', price: 1450, category: 'Mains', image: 'https://images.unsplash.com/photo-1574129624542-46c230756539?w=600&h=600&fit=crop', rating: 4.9 },
  { id: '11', name: 'Aurelia Bowl', description: 'Quinoa, roasted seasonal squash, spiced chickpeas, and tahini drizzle.', price: 1320, category: 'Mains', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop', rating: 4.5 },
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');

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

  // Load orders from local storage and sync with Socket.io
  useEffect(() => {
    const savedOrders = localStorage.getItem('cafe_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const syncWithServer = () => {
       const local = JSON.parse(localStorage.getItem('cafe_orders') || '[]');
       if (local.length > 0) {
         socket.emit('sync-local-orders', local);
       }
    };
    
    socket.on('connect', syncWithServer);
    if (socket.connected) syncWithServer();

    socket.on('init-orders', (serverOrders: Order[]) => {
      // The server is the single source of truth for the session
      setOrders(serverOrders);
      localStorage.setItem('cafe_orders', JSON.stringify(serverOrders));
    });

    socket.on('order-added', (newOrder: Order) => {
      setOrders(prev => {
        // Prevent duplicate if this device placed the order
        if(prev.find(o => o.id === newOrder.id)) return prev;
        const updated = [newOrder, ...prev];
        localStorage.setItem('cafe_orders', JSON.stringify(updated));
        
        // Notify staff devices when a new order arrives from another device
        if (Notification.permission === "granted") {
           new Notification("New Order Received!", { body: `Table ${newOrder.tableNumber} ordered ${newOrder.items.length} items (₹${newOrder.total}).`, icon: '/vite.svg' });
        }
        
        return updated;
      });
    });

    socket.on('order-updated', ({ orderId, status }: { orderId: string, status: Order['status'] }) => {
      setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? { ...o, status } : o);
        localStorage.setItem('cafe_orders', JSON.stringify(updated));
        
        const order = updated.find(o => o.id === orderId);
        if (order && Notification.permission === "granted") {
           if (status === 'preparing') {
             new Notification("Order is being prepared!", { body: `Great news! The kitchen has started preparing the order for Table ${order.tableNumber}.`, icon: '/vite.svg' });
           } else if (status === 'ready') {
             new Notification("Order Ready!", { body: `Order for Table ${order.tableNumber} is ready for delivery.`, icon: '/vite.svg' });
           }
        }
        
        return updated;
      });
    });

    return () => {
      socket.off('connect', syncWithServer);
      socket.off('init-orders');
      socket.off('order-added');
      socket.off('order-updated');
    };
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

  const showNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/vite.svg' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/vite.svg' });
        }
      });
    }
  };

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
    
    socket.emit('new-order', newOrder);
    saveOrders([newOrder, ...orders]);
    setCart([]);
    setPaymentMethod(null);
    setView('order-success');
    
    showNotification("New Order Received!", `Table ${newOrder.tableNumber} just ordered ${newOrder.items.length} items (₹${newOrder.total}).`);
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    socket.emit('update-order-status', { orderId, status: newStatus });
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    saveOrders(updatedOrders);
    
    const order = updatedOrders.find(o => o.id === orderId);
    if (order && newStatus === 'ready') {
       showNotification("Order Ready!", `Order for Table ${order.tableNumber} is ready for delivery.`);
    }
  };

  const downloadCSV = () => {
    const headers = "Order ID,Table,Items,Total (INR),Status,Time\n";
    const rows = orders.map(o => {
       const itemsStr = o.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
       const time = new Date(o.timestamp).toLocaleString();
       return `${o.id},${o.tableNumber},"${itemsStr}",${o.total},${o.status},"${time}"`;
    }).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafe_orders_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printBill = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if(!printWindow) return;
    
    const itemsHtml = order.items.map(i => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>${i.quantity}x ${i.name}</span>
        <span>Rs. ${i.price * i.quantity}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - Table ${order.tableNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center font-bold" style="font-size: 1.5em; margin-bottom: 5px;">Aurelia Cafe</div>
          <div class="text-center" style="margin-bottom: 15px;">Table: ${order.tableNumber} | Order: ${order.id}</div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between;" class="font-bold">
            <span>TOTAL</span>
            <span>Rs. ${order.total}</span>
          </div>
          <div class="divider"></div>
          <div class="text-center" style="margin-top: 20px;">Thank you for your visit!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
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
            <section className="relative h-[100vh] w-full flex flex-col items-center justify-center bg-[var(--bg-primary)] overflow-hidden group">
               <div className="grain"></div>
               <div className="ambient-canvas"></div>

               <header className="absolute top-24 md:top-32 text-center w-full z-30">
                   <h1 className="font-serif font-bold text-2xl md:text-3xl uppercase tracking-[0.2em] text-[var(--secondary)] mb-2">Aurelia Cafe</h1>
                   <p className="font-sans text-[10px] md:text-xs text-[var(--text-main)] opacity-60 tracking-widest uppercase">Position QR Within Frame</p>
               </header>

               <div className="scanner-viewport z-20">
                  <div className="corner tl"></div>
                  <div className="corner tr"></div>
                  <div className="corner bl"></div>
                  <div className="corner br"></div>
                  
                  {isCameraActive ? (
                     <>
                        <div className="scan-line"></div>
                        <div className="absolute inset-0 z-10 bg-black">
                           <Scanner 
                              onScan={(result) => handleScan(result[0].rawValue)}
                              styles={{ container: { width: '100%', height: '100%' } }}
                              components={{ finder: false }}
                           />
                        </div>
                     </>
                  ) : (
                     <div className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => setIsCameraActive(true)}>
                        <QrCode className="w-12 h-12 text-[var(--secondary)] mb-4 opacity-80" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-main)]">Tap to Activate</span>
                     </div>
                  )}
               </div>

               <div className="status-pill bottom-32 md:bottom-40">
                  <div className="status-dot"></div>
                  <span className="font-mono text-[10px] md:text-[11px] tracking-widest uppercase text-[var(--text-main)]">
                    {isCameraActive ? 'Aligning Sensors...' : 'Camera Standby'}
                  </span>
               </div>

               <footer className="absolute bottom-12 md:bottom-20 flex gap-6 z-30">
                  <div className="control-btn text-[var(--text-main)]" title="Toggle Flash" onClick={() => setIsCameraActive(!isCameraActive)}>
                     <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M7 2v11h3v9l7-12h-4l4-8H7z"/></svg>
                  </div>
                  <div className="control-btn text-[var(--text-main)]" title="Manual Entry" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                     <ChevronDown className="w-5 h-5" />
                  </div>
               </footer>
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
               <section className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12 md:gap-20 text-center mb-24 md:mb-40">
                  {[
                    { icon: QrCode, title: 'Scan & Order', desc: 'Instant access from your table' },
                    { icon: Phone, title: 'Cash or Digital', desc: 'Flexible payment options' },
                    { icon: Utensils, title: 'Prepared Fresh', desc: 'Our kitchen crafts your order' },
                    { icon: CheckCircle2, title: 'Delivered', desc: 'Waiters bring it directly to you' }
                  ].map((item, idx) => (
                    <motion.div 
                       key={idx} 
                       className="space-y-4 md:space-y-6 group bg-[var(--tile-bg)] md:bg-transparent p-6 md:p-0 rounded-3xl"
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: idx * 0.1 }}
                    >
                       <div className="flex justify-center transition-transform group-hover:-translate-y-3 duration-500">
                          <item.icon strokeWidth={0.5} className="w-12 h-12 md:w-14 md:h-14 text-[var(--tile-icon)]" />
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

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                  {filteredItems.map(item => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="group card overflow-hidden p-0 flex flex-col hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] transition-all duration-700 rounded-2xl md:rounded-3xl aspect-square relative"
                    >
                      <img 
                         src={item.image} 
                         alt={item.name} 
                         className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      
                      <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-black/40 backdrop-blur-md px-2 py-1 md:px-4 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase flex items-center gap-1 text-white/90 border border-white/10 shadow-lg">
                         <Star size={8} className="md:w-3 md:h-3 text-[var(--secondary)] fill-current" /> {item.rating}
                      </div>

                      <div className="absolute top-3 left-3 md:top-4 md:left-4">
                         <span className="text-[7px] md:text-[9px] uppercase tracking-[0.3em] font-black text-black px-2 py-1 md:px-4 md:py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg">{item.category}</span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-6 flex flex-col z-10 text-white">
                        <h4 className="text-sm sm:text-base md:text-2xl font-black font-serif italic tracking-tight leading-tight mb-1">{item.name}</h4>
                        <p className="text-[8px] sm:text-[9px] md:text-xs text-white/70 font-medium leading-relaxed line-clamp-2 md:line-clamp-2 mb-3">{item.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                           <span className="text-sm md:text-xl font-black gold-gradient drop-shadow-md">₹{item.price.toFixed(0)}</span>
                           <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="font-black text-[9px] md:text-[10px] uppercase tracking-widest text-[var(--primary)] bg-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:bg-[var(--secondary)] hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1">
                             <Plus size={10} className="md:hidden" /> Add
                           </button>
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
                            <p className="text-lg md:text-xl text-[var(--secondary)] font-bold">₹{(item.price * item.quantity).toFixed(0)}</p>
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
                        <span className="text-4xl md:text-6xl font-black gold-gradient tracking-tighter">₹{cartTotal.toFixed(0)}</span>
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
                           <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Scan to Pay ₹{cartTotal.toFixed(0)}</p>
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
            className="p-5 md:p-10 lg:p-20 max-w-7xl mx-auto pb-32 md:pb-40"
          >
            {!isAuthenticated ? (
               <div className="flex flex-col items-center justify-center min-h-[60vh]">
                  <h2 className="text-3xl md:text-5xl font-black italic font-serif mb-6 tracking-tight">Staff Terminal</h2>
                  <p className="text-[10px] md:text-xs text-[var(--text-muted)] uppercase tracking-widest font-black mb-8">Enter Authorization PIN</p>
                  <div className="flex flex-col gap-4 w-full max-w-xs">
                     <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        className="w-full text-center text-4xl tracking-[0.5em] py-4 bg-white border-2 border-black/5 rounded-2xl focus:outline-none focus:border-[var(--secondary)]"
                     />
                     <button 
                        onClick={() => {
                           if (pin === '1234') { setIsAuthenticated(true); setPin(''); }
                           else { alert('Invalid PIN'); setPin(''); }
                        }}
                        className="w-full btn bg-near-black text-white py-5 shadow-xl"
                     >
                        Unlock Terminal
                     </button>
                     <button onClick={() => { setView('welcome'); setPin(''); }} className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-4 font-bold hover:text-black">Return to Welcome</button>
                  </div>
               </div>
            ) : (
              <>
                <div className="flex flex-col lg:flex-row items-center justify-between mb-10 md:mb-16 border-b border-black/5 pb-8 md:pb-12 gap-6 md:gap-8">
                   <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto justify-between lg:justify-start">
                     <button onClick={() => { setView('welcome'); setIsAuthenticated(false); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-black/10 flex items-center justify-center hover:bg-near-black hover:text-white transition-all"><ArrowLeft size={20} className="md:w-6 md:h-6" /></button>
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
                        <p className="text-3xl font-serif italic text-near-black">₹{orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0).toFixed(0)}</p>
                     </div>
                     <div className="card p-6 bg-white shadow-xl rounded-3xl border border-black/5">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-2">Total Orders</p>
                        <p className="text-3xl font-serif italic text-near-black">{orders.length}</p>
                     </div>
                     <div className="card p-6 bg-white shadow-xl rounded-3xl border border-black/5">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-2">Active Tables</p>
                        <p className="text-3xl font-serif italic text-near-black">{new Set(orders.filter(o => o.status !== 'delivered').map(o => o.tableNumber)).size}</p>
                     </div>
                     <div 
                        className="card p-6 bg-[var(--secondary)] text-white shadow-xl rounded-3xl cursor-pointer hover:bg-black transition-colors"
                        onClick={() => {
                          if ("Notification" in window) {
                             Notification.requestPermission().then(p => {
                                if(p === 'granted') alert('Push Notifications Enabled!');
                             });
                          }
                        }}
                     >
                        <p className="text-[10px] uppercase tracking-widest text-white/80 font-black mb-2">Push Alerts</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-serif italic">Enable</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                     <h3 className="text-2xl md:text-3xl font-serif italic">Order Details & Revenue</h3>
                     <button onClick={downloadCSV} className="btn bg-near-black text-white px-6 py-3 text-[10px] tracking-widest uppercase shadow-lg flex items-center gap-2">
                        Download CSV
                     </button>
                  </div>
                  
                  <div className="bg-white rounded-[32px] p-6 shadow-xl border border-black/5 overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                           <tr className="border-b border-black/5">
                              <th className="pb-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">Table/User</th>
                              <th className="pb-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">Items</th>
                              <th className="pb-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">Revenue</th>
                              <th className="pb-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black">Status</th>
                              <th className="pb-4 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                           {orders.map(order => (
                              <tr key={order.id} className="border-b border-black/5 last:border-0 hover:bg-gray-50 transition-colors">
                                 <td className="py-4 font-serif text-lg">
                                    Table {order.tableNumber}
                                    <span className="block text-[10px] font-sans uppercase tracking-widest text-gray-400 font-bold mt-1">
                                       {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                 </td>
                                 <td className="py-4">
                                    <div className="text-xs text-gray-600 max-w-xs truncate">
                                       {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </div>
                                 </td>
                                 <td className="py-4 font-bold text-[var(--secondary)]">₹{order.total.toFixed(0)}</td>
                                 <td className="py-4">
                                    <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                       {order.status}
                                    </span>
                                 </td>
                                 <td className="py-4 text-right">
                                    <button 
                                       onClick={() => printBill(order)} 
                                       className="text-[9px] uppercase tracking-widest font-black text-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 rounded-full hover:bg-[var(--primary)] hover:text-white transition-colors"
                                    >
                                       Print Bill
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     {orders.length === 0 && <p className="text-[var(--text-muted)] text-center py-10">No orders placed yet.</p>}
                  </div>
               </div>
            ) : adminTab === 'tables' ? (
               <div className="max-w-2xl mx-auto text-center px-4 md:px-0 pb-32 md:pb-40">
                  <div className="card p-8 md:p-12 bg-white shadow-2xl rounded-[32px] md:rounded-[40px] border border-black/5 relative overflow-hidden flex flex-col items-center mt-4">
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
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-32">
                  {orders.filter(o => 
                    adminTab === 'kitchen' ? ['pending', 'preparing'].includes(o.status) 
                    : ['ready', 'delivered'].includes(o.status)
                  ).length === 0 ? (
                    <div className="col-span-full py-20 text-center border-4 border-dashed border-black/5 rounded-3xl">
                       <p className="text-[var(--text-muted)] italic text-lg md:text-xl font-serif px-6">No active tasks in this queue.</p>
                    </div>
                  ) : (
                    orders.filter(o => 
                      adminTab === 'kitchen' ? ['pending', 'preparing'].includes(o.status) 
                      : ['ready', 'delivered'].includes(o.status)
                    ).map(order => (
                      <motion.div layout key={order.id} className="card bg-white p-5 md:p-6 flex flex-col gap-4 shadow-lg border border-black/5 relative overflow-hidden rounded-2xl md:rounded-3xl">
                         {order.status === 'delivered' && <div className="absolute inset-0 bg-white/60 z-10 pointer-events-none" />}
                         
                         <div className="flex justify-between items-start border-b border-black/5 pb-4">
                            <div>
                               <span className="text-2xl md:text-3xl font-black italic font-serif tracking-tight block mb-1">Table {order.tableNumber}</span>
                               <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                 {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Pay: {order.paymentMethod}
                               </span>
                            </div>
                            <span className={`px-3 py-1 text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm ${order.status === 'pending' ? 'bg-red-500' : order.status === 'preparing' ? 'bg-orange-500' : order.status === 'ready' ? 'bg-green-500' : 'bg-gray-400'}`}>
                               {order.status}
                            </span>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto max-h-[200px] pr-2 space-y-2 my-2">
                            {order.items.map(i => (
                              <div key={i.id} className="flex justify-between items-start text-sm md:text-base font-bold">
                                 <span className="font-serif italic leading-tight"><span className="text-[var(--secondary)] text-xs font-black mr-2 not-italic">{i.quantity}x</span> {i.name}</span>
                              </div>
                            ))}
                         </div>
                         
                         <div className="border-t border-black/5 pt-4 mt-auto">
                            <div className="flex justify-between items-center mb-4">
                               <span className="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)]">Total</span>
                               <span className="text-xl md:text-2xl font-black gold-gradient tracking-tighter">₹{order.total.toFixed(0)}</span>
                            </div>
                            
                            {/* Action Buttons based on status */}
                            <div className="flex flex-col gap-2">
                               {order.status === 'pending' && adminTab === 'kitchen' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="btn bg-orange-500 text-white py-3 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-md hover:bg-orange-600 transition-colors">Start Preparing</button>
                               )}
                               {order.status === 'preparing' && adminTab === 'kitchen' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'ready')} className="btn bg-green-500 text-white py-3 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-md hover:bg-green-600 transition-colors">Mark as Ready</button>
                               )}
                               {order.status === 'ready' && adminTab === 'waiter' && (
                                 <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="btn bg-blue-500 text-white py-3 text-[9px] md:text-[10px] tracking-[0.2em] w-full shadow-md hover:bg-blue-600 transition-colors">Mark Delivered</button>
                               )}
                               {order.status === 'delivered' && (
                                 <span className="text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 py-2 rounded-lg">Completed</span>
                               )}
                            </div>
                         </div>
                      </motion.div>
                    ))
                  )}
               </div>
            )}
            </>
          )}
          </motion.div>
        )}

      </AnimatePresence>


      {/* --- Unified Floating Nav Pill for Guests --- */}
      {view === 'menu' && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex justify-center w-[95%] max-w-[500px]">
           <nav className="vitreous-nav reveal" onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
              e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
              const tiltX = (rect.height / 2 - (e.clientY - rect.top)) / 10;
              const tiltY = ((e.clientX - rect.left) - rect.width / 2) / 25;
              e.currentTarget.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
           }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = `rotateX(0) rotateY(0)`;
           }}>
              <div className="nav-items flex">
                  <button onClick={() => setView('menu')} className="nav-link px-3 sm:px-5 active"><Coffee size={20} /></button>
                  <button onClick={() => setView('cart')} className="nav-link px-3 sm:px-5">
                     <ShoppingBag size={20} />
                     {cart.length > 0 && <span className="absolute top-1.5 right-2 sm:right-4 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                  </button>
                  <button onClick={() => setView('admin')} className="nav-link px-3 sm:px-5"><LayoutGrid size={20} /></button>
              </div>

              <div className="divider"></div>

              <button className="cart-trigger shrink-0 !px-3 sm:!px-5" onClick={() => setView('cart')}>
                  <span className="cart-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                  <span className="cart-label italic font-serif text-[var(--secondary)] hidden sm:inline-block">₹{cartTotal.toFixed(0)}</span>
              </button>
           </nav>
        </div>
      )}

      {/* --- Unified Floating Nav Pill for Staff --- */}
      {view === 'admin' && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex justify-center w-[95%] max-w-[600px]">
           <nav className="vitreous-nav reveal" onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
              e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
              const tiltX = (rect.height / 2 - (e.clientY - rect.top)) / 10;
              const tiltY = ((e.clientX - rect.left) - rect.width / 2) / 25;
              e.currentTarget.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
           }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = `rotateX(0) rotateY(0)`;
           }}>
              <div className="nav-items flex">
                  <button onClick={() => setAdminTab('manager')} className={`nav-link px-4 sm:px-6 ${adminTab === 'manager' ? 'active' : ''}`}><BarChart3 size={20} /></button>
                  <button onClick={() => setAdminTab('kitchen')} className={`nav-link px-4 sm:px-6 ${adminTab === 'kitchen' ? 'active' : ''}`}><Utensils size={20} /></button>
                  <button onClick={() => setAdminTab('waiter')} className={`nav-link px-4 sm:px-6 ${adminTab === 'waiter' ? 'active' : ''}`}><ClipboardList size={20} /></button>
                  <button onClick={() => setAdminTab('tables')} className={`nav-link px-4 sm:px-6 ${adminTab === 'tables' ? 'active' : ''}`}><QrCode size={20} /></button>
              </div>
           </nav>
        </div>
      )}
    </div>
  );
}
