import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * Light / Dark / System switcher. Themes toggle the `dark` class on <html>
 * (see index.css's dark token block); "System" follows the OS setting.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  // Icons depend on the resolved theme, which next-themes only knows after
  // mount — render a neutral icon until then to avoid any flip-flicker.
  // useSyncExternalStore reports mounted-ness without an effect setState.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-md text-muted-foreground"
          aria-label="Change theme"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          <Sun className="mr-2 size-4" />
          Light
          {theme === "light" && (
            <span className="ml-auto font-mono text-[10px] text-primary">
              ●
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          <Moon className="mr-2 size-4" />
          Dark
          {theme === "dark" && (
            <span className="ml-auto font-mono text-[10px] text-primary">
              ●
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          <Monitor className="mr-2 size-4" />
          System
          {theme === "system" && (
            <span className="ml-auto font-mono text-[10px] text-primary">
              ●
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
