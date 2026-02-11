import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full p-2.5 rounded-lg dark:bg-white/10 light:bg-green-100 dark:hover:bg-white/15 light:hover:bg-green-200 dark:border-white/10 light:border-green-300/50 border transition-all flex items-center justify-center gap-2 group"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <>
          <span className="material-symbols-outlined dark:text-white light:text-text-dark text-lg group-hover:text-primary transition-colors">light_mode</span>
          <span className="text-xs font-semibold dark:text-white light:text-text-dark group-hover:text-primary transition-colors">Light Mode</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined dark:text-white light:text-text-dark text-lg group-hover:text-primary transition-colors">dark_mode</span>
          <span className="text-xs font-semibold dark:text-white light:text-text-dark group-hover:text-primary transition-colors">Dark Mode</span>
        </>
      )}
    </button>
  );
}
