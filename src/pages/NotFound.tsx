import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, TerminalSquare } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center"
    >
      <p className="font-mono text-7xl font-bold tracking-tight text-foreground/10">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        This machine doesn't exist
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you asked for isn't part of the machine room. Head back and
        pick a distro to boot instead.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
        <Button asChild>
          <Link to="/run/buildroot">
            <TerminalSquare className="size-4" />
            Boot a distro
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
