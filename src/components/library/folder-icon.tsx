"use client";

import {
    AppWindow,
    AudioLines,
    Award,
    BookOpen,
    Briefcase,
    Calendar,
    Camera,
    Car,
    ChartColumn,
    CircleUser,
    ClipboardList,
    Cloud,
    Columns3,
    Contact,
    Database,
    FileSignature,
    FileText,
    FileUser,
    FlaskConical,
    Flower2,
    Folder,
    FolderOpen,
    FolderUp,
    Gamepad2,
    Gavel,
    Globe,
    GraduationCap,
    HandHeart,
    Handshake,
    Heart,
    HeartPulse,
    History,
    House,
    IdCard,
    Image,
    Lightbulb,
    List,
    ListChecks,
    type LucideIcon,
    MapPin,
    Megaphone,
    MessageSquareMore,
    Mic,
    Mountain,
    Music,
    NotebookPen,
    PencilRuler,
    PhoneCall,
    Pill,
    Presentation,
    Receipt,
    Scale,
    Shapes,
    SlidersHorizontal,
    Smile,
    SquareArrowDown,
    Star,
    Stethoscope,
    Store,
    Syringe,
    Tag,
    TrendingUp,
    User,
    UserCheck,
    UserPlus,
    UserRoundPen,
    Users,
    UsersRound,
    Video,
} from "lucide-react";
import {
    FOLDER_COLOR_CLASSES,
    type FolderColor,
    type FolderIconKey,
} from "@/lib/library/types";
import { cn } from "@/lib/utils";

/** lucide glyph for every key in FOLDER_ICONS. */
export const FOLDER_ICON_COMPONENTS: Record<FolderIconKey, LucideIcon> = {
    folder: Folder,
    "book-open": BookOpen,
    "gamepad-2": Gamepad2,
    users: Users,
    "phone-call": PhoneCall,
    heart: Heart,
    award: Award,
    "message-square-more": MessageSquareMore,
    "file-text": FileText,
    cloud: Cloud,
    house: House,
    globe: Globe,
    mic: Mic,
    "id-card": IdCard,
    camera: Camera,
    video: Video,
    music: Music,
    star: Star,
    user: User,
    tag: Tag,
    database: Database,
    "circle-user": CircleUser,
    "folder-up": FolderUp,
    list: List,
    "clipboard-list": ClipboardList,
    "list-checks": ListChecks,
    syringe: Syringe,
    "heart-pulse": HeartPulse,
    stethoscope: Stethoscope,
    "map-pin": MapPin,
    image: Image,
    mountain: Mountain,
    "flower-2": Flower2,
    briefcase: Briefcase,
    car: Car,
    calendar: Calendar,
    history: History,
    "app-window": AppWindow,
    "chart-column": ChartColumn,
    scale: Scale,
    shapes: Shapes,
    smile: Smile,
    "audio-lines": AudioLines,
    contact: Contact,
    "user-round-pen": UserRoundPen,
    "file-user": FileUser,
    "user-check": UserCheck,
    "users-round": UsersRound,
    "hand-heart": HandHeart,
    lightbulb: Lightbulb,
    "user-plus": UserPlus,
    "file-signature": FileSignature,
    receipt: Receipt,
    "notebook-pen": NotebookPen,
    "square-arrow-down": SquareArrowDown,
    "sliders-horizontal": SlidersHorizontal,
    gavel: Gavel,
    "columns-3": Columns3,
    "pencil-ruler": PencilRuler,
    pill: Pill,
    "flask-conical": FlaskConical,
    "graduation-cap": GraduationCap,
    presentation: Presentation,
    store: Store,
    megaphone: Megaphone,
    handshake: Handshake,
    "trending-up": TrendingUp,
};

/**
 * A Plaud-style folder: colored folder outline, with the chosen glyph
 * drawn inside it (plain "folder" shows just the tinted folder).
 */
export function FolderIcon({
    color,
    icon,
    open = false,
    className,
}: {
    color: FolderColor;
    icon: FolderIconKey;
    open?: boolean;
    className?: string;
}) {
    const tint = FOLDER_COLOR_CLASSES[color];
    if (icon === "folder") {
        const Shape = open ? FolderOpen : Folder;
        return (
            <Shape
                className={cn(
                    "size-5 shrink-0 fill-current/20",
                    tint,
                    className,
                )}
                aria-hidden="true"
            />
        );
    }
    const Glyph = FOLDER_ICON_COMPONENTS[icon];
    return (
        <span
            className={cn(
                "relative inline-flex size-5 shrink-0 items-center justify-center",
                tint,
                className,
            )}
            aria-hidden="true"
        >
            <Folder className="absolute inset-0 size-full fill-current/15" />
            <Glyph className="relative mt-[12%] size-[48%]" strokeWidth={2.5} />
        </span>
    );
}
