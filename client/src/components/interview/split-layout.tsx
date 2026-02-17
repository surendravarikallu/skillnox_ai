import * as React from "react";
import { cn } from "@/lib/utils";


export interface SplitLayoutProps {
    left: React.ReactNode;
    center: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
}

export function SplitLayout({ left, center, right, className }: SplitLayoutProps) {
    const [isRightCollapsed, setIsRightCollapsed] = React.useState(false);

    return (
        <div className={cn("w-full", className)}>
            {/* Desktop: 3-column layout */}
            <div className="hidden lg:grid lg:grid-cols-5 gap-6">
                {/* Left column: Camera preview */}
                <div className="lg:col-span-2 space-y-4">
                    {left}
                </div>

                {/* Center column: Question & answer */}
                <div className="lg:col-span-3 space-y-4">
                    {center}
                </div>

                {/* Right column: AI feedback (optional) */}
                {right && (
                    <div className="lg:col-span-2 space-y-4">
                        {right}
                    </div>
                )}
            </div>

            {/* Tablet: 2-column layout (no right panel) */}
            <div className="hidden md:grid lg:hidden md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                    {left}
                </div>
                <div className="md:col-span-3">
                    {center}
                </div>
            </div>

            {/* Mobile: Stacked layout */}
            <div className="md:hidden space-y-4">
                {left}
                {center}
                {right}
            </div>
        </div>
    );
}
