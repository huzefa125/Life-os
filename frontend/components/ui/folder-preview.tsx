"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FolderBackIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 20 16" className={cn("w-full h-full fill-current", className)}>
        <path d="M7.5,0C7.4,0,2,0,2,0C0.9,0,0,0.9,0,2l0,12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4c0-1.1-0.9-2-2-2c0,0-7.5,0-8,0C9,2,9.9,0,7.5,0z" />
    </svg>
);

const FolderCoverIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 20 16" className={cn("w-full h-full fill-current", className)}>
        <path d="M2,2h16c1.1,0,2,0.9,2,2v10c0,1.1-0.9,2-2,2H2c-1.1,0-2-0.9-2-2V4C0,2.9,0.9,2,2,2z" />
    </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={cn("w-full h-full fill-current", className)}>
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <path d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M12,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,12,20z" />
    </svg>
);

const CloudIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 22.2" className={cn("w-full h-full fill-current", className)}>
        <path d="M19.5,5.8c-0.3-1.5-1-2.9-2.2-4c-1.3-1.2-3-1.8-4.7-1.8C11.3,0,10,0.4,8.9,1.1C8,1.7,7.2,2.5,6.6,3.5c-0.2,0-0.5-0.1-0.7-0.1c-2.1,0-3.8,1.7-3.8,3.8c0,0.3,0,0.5,0.1,0.8C0.8,9,0,10.6,0,12.3C0,13.6,0.5,15,1.4,16c1,1.1,2.2,1.7,3.6,1.8c0,0,0,0,0,0h4.2c0.4,0,0.7-0.3,0.7-0.7s-0.3-0.7-0.7-0.7H5c-2-0.1-3.7-2-3.7-4.2c0-1.4,0.8-2.7,2-3.4c0.3-0.2,0.4-0.5,0.3-0.8C3.5,7.8,3.4,7.5,3.4,7.2c0-1.4,1.1-2.5,2.5-2.5c0.3,0,0.6,0,0.8,0.1c0.3,0.1,0.7,0,0.8-0.3c0.9-2,2.9-3.2,5.1-3.2c2.9,0,5.3,2.2,5.6,5.1c0,0.3,0.3,0.5,0.6,0.6c2.2,0.4,3.9,2.4,3.9,4.7c0,2.5-1.9,4.6-4.3,4.8h-3.6c-0.4,0-0.7,0.3-0.7,0.7s0.3,0.7,0.7,0.7h3.7c0,0,0,0,0,0c1.5-0.1,2.9-0.8,4-2c1-1.1,1.6-2.6,1.6-4.1C24,8.9,22.1,6.5,19.5,5.8z M16,12.9c0.3-0.3,0.3-0.7,0-0.9l-3.5-3.5c-0.1-0.1-0.3-0.2-0.5-0.2c-0.2,0-0.3,0.1-0.5,0.2L8,12c-0.3,0.3-0.3,0.7,0,0.9c0.1,0.1,0.3,0.2,0.5,0.2c0.2,0,0.3-0.1,0.5-0.2l2.4-2.4v11c0,0.4,0.3,0.7,0.7,0.7s0.7-0.3,0.7-0.7v-11l2.4,2.4C15.3,13.2,15.7,13.2,16,12.9z" />
    </svg>
);

const FileIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 20 26.8" className={cn("w-full h-full fill-current", className)}>
        <path d="M2.3,0C1,0,0,1,0,2.3v22.2c0,1.2,1,2.3,2.3,2.3h15.4c1.2,0,2.3-1,2.3-2.3V6l-6-6H2.3z" />
        <path opacity="0.1" d="M13.9,3.7V0l6,6h-3.7C14.9,6,13.9,5,13.9,3.7z" />
    </svg>
);

/**
 * Trimmed to the two file-name-list variants ("durga", "nandi") from VengeanceUI's
 * folder-preview — the other 7 upstream variants preview photo `<img>` avatars, which
 * doesn't fit our file references (name + mime type, not photos).
 */
export type FolderVariant = "durga" | "nandi";

export interface FolderPreviewFile {
    name: string;
    type?: "txt" | "gif" | "mp3" | "default";
}

export interface FolderPreviewProps {
    variant?: FolderVariant;
    files: FolderPreviewFile[];
    label?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
    onClick?: () => void;
}

const variantColors: Record<
    FolderVariant,
    { back: string; cover: string; deco: string; caption: string }
> = {
    durga: {
        back: "text-green-600",
        cover: "text-green-500",
        deco: "text-green-600",
        caption: "text-green-700 dark:text-green-400 font-mono",
    },
    nandi: {
        back: "text-amber-500",
        cover: "text-amber-400",
        deco: "text-amber-500",
        caption: "text-gray-900 dark:text-gray-100",
    },
};

const sizeConfig = {
    sm: { folder: "w-16", deco: "w-4 h-4", caption: "text-xs" },
    md: { folder: "w-24", deco: "w-6 h-6", caption: "text-sm" },
    lg: { folder: "w-32", deco: "w-8 h-8", caption: "text-base" },
};

const DurgaFolder: React.FC<{
    files: FolderPreviewFile[];
    isHovered: boolean;
    colors: (typeof variantColors)["durga"];
    sizes: (typeof sizeConfig)["md"];
    label?: string;
}> = ({ files, isHovered, colors, sizes, label }) => {
    return (
        <div className="relative">
            <motion.div
                className="absolute -right-2 top-0 z-20 min-w-[100px] rounded-lg bg-gray-800 px-3 py-2 shadow-lg dark:bg-gray-900"
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                animate={isHovered ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -10, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: "translateX(100%)" }}
            >
                {files.slice(0, 6).map((file, i) => (
                    <motion.div
                        key={i}
                        className="whitespace-nowrap py-0.5 font-mono text-xs text-gray-100"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovered ? 1 : 0 }}
                        transition={{ duration: 0.05, delay: i * 0.03 }}
                    >
                        {file.name}
                    </motion.div>
                ))}
            </motion.div>

            <div className="relative aspect-[20/16] cursor-pointer" style={{ perspective: "800px" }}>
                <div className={cn("absolute inset-0", colors.back)}>
                    <FolderBackIcon />
                </div>
                <div className="absolute bottom-0.5 left-0.5 right-0.5 h-3/4 rounded-lg bg-white dark:bg-gray-200" />
                <motion.div
                    className={cn("relative", colors.cover)}
                    style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
                    animate={isHovered ? { rotateX: -30 } : { rotateX: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <FolderCoverIcon />
                    <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", sizes.deco, colors.deco)}>
                        <GlobeIcon />
                    </div>
                </motion.div>
            </div>

            {label ? <h3 className={cn("mt-3 text-center font-medium", sizes.caption, colors.caption)}>{label}</h3> : null}
        </div>
    );
};

const NandiFolder: React.FC<{
    files: FolderPreviewFile[];
    isHovered: boolean;
    colors: (typeof variantColors)["nandi"];
    sizes: (typeof sizeConfig)["md"];
    label?: string;
}> = ({ files, isHovered, colors, sizes, label }) => {
    const fileColorMap: Record<string, string> = {
        txt: "fill-blue-300",
        gif: "fill-teal-400",
        mp3: "fill-amber-400",
        default: "fill-gray-400",
    };

    return (
        <div className="relative">
            <motion.div
                className="absolute left-1/2 z-20 grid -translate-x-1/2 grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-xl dark:bg-gray-100"
                style={{ bottom: "100%", marginBottom: "8px", minWidth: "120px" }}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={isHovered ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
                {files.slice(0, 6).map((file, i) => (
                    <div key={i} className="text-center">
                        <FileIcon className={cn("mx-auto h-5 w-5", fileColorMap[file.type || "default"])} />
                        <span className="mt-0.5 block max-w-[35px] truncate text-[8px] text-gray-600">{file.name}</span>
                    </div>
                ))}
            </motion.div>

            <div className="relative aspect-[20/16] cursor-pointer" style={{ perspective: "800px" }}>
                <div className={cn("absolute inset-0", colors.back)}>
                    <FolderBackIcon />
                </div>
                <div className="absolute bottom-0.5 left-0.5 right-0.5 h-3/4 rounded-lg bg-white dark:bg-gray-200" />
                <motion.div
                    className={cn("relative", colors.cover)}
                    style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
                    animate={isHovered ? { rotateX: -30 } : { rotateX: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <FolderCoverIcon />
                    <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", sizes.deco, colors.deco)}>
                        <CloudIcon />
                    </div>
                </motion.div>
            </div>

            {label ? <h3 className={cn("mt-3 text-center font-medium", sizes.caption, colors.caption)}>{label}</h3> : null}
        </div>
    );
};

export const FolderPreview = React.forwardRef<HTMLDivElement, FolderPreviewProps>(
    ({ variant = "nandi", files, label, size = "md", className, onClick }, ref) => {
        const [isHovered, setIsHovered] = React.useState(false);
        const colors = variantColors[variant];
        const sizes = sizeConfig[size];

        return (
            <div
                ref={ref}
                className={cn("inline-flex flex-col items-center overflow-visible", sizes.folder, className)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onClick}
            >
                {variant === "durga" ? (
                    <DurgaFolder files={files} isHovered={isHovered} colors={colors} sizes={sizes} label={label} />
                ) : (
                    <NandiFolder files={files} isHovered={isHovered} colors={colors} sizes={sizes} label={label} />
                )}
            </div>
        );
    }
);

FolderPreview.displayName = "FolderPreview";

export default FolderPreview;
