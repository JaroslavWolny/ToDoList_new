import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ListTodo, BarChart3, Settings } from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
    const location = useLocation();
    if (location.pathname === '/onboarding') return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 glass safe-bottom">
            <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="relative flex flex-col items-center gap-0.5 py-1.5 px-4"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="navIndicator"
                                    className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon
                                className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-500' : 'text-[var(--color-text-secondary)]'
                                    }`}
                            />
                            <span
                                className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary-500' : 'text-[var(--color-text-secondary)]'
                                    }`}
                            >
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
