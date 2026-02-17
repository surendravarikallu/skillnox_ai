import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DashboardGridProps {
    columns?: 2 | 3 | 4;
    stagger?: boolean;
    className?: string;
    children?: React.ReactNode;
}

const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export function DashboardGrid({
    columns = 3,
    stagger = true,
    className,
    children,
}: DashboardGridProps) {
    const childArray = React.Children.toArray(children);

    if (!stagger) {
        return (
            <div className={cn("grid gap-6", columnClasses[columns], className)}>
                {children}
            </div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className={cn("grid gap-6", columnClasses[columns], className)}
        >
            {childArray.map((child, index) => (
                <motion.div key={index} variants={item}>
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}
