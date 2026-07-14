import type { Role } from "./roles";

export type NavItem = { href: string; labelAr: string; labelEn: string; icon: string };

export const dashboardNav: Record<Role, NavItem[]> = {
  super_admin: [
    { href: "/admin", labelAr: "نظرة عامة", labelEn: "Overview", icon: "LayoutDashboard" },
    { href: "/admin/users", labelAr: "المستخدمون", labelEn: "Users", icon: "Users" },
    { href: "/admin/approvals", labelAr: "الاعتمادات", labelEn: "Approvals", icon: "CheckCircle" },
    { href: "/admin/role-requests", labelAr: "طلبات الترقية", labelEn: "Role requests", icon: "UserCog" },
    { href: "/admin/tournaments", labelAr: "البطولات", labelEn: "Tournaments", icon: "Trophy" },
    { href: "/admin/events", labelAr: "الفعاليات", labelEn: "Events", icon: "CalendarDays" },
    { href: "/admin/results", labelAr: "النتائج", labelEn: "Results", icon: "ListChecks" },
    { href: "/admin/rankings", labelAr: "التصنيفات", labelEn: "Rankings", icon: "Medal" },
    { href: "/admin/sports", labelAr: "الرياضات", labelEn: "Sports", icon: "Target" },
    { href: "/admin/geography", labelAr: "الجغرافيا", labelEn: "Geography", icon: "Globe" },
    { href: "/admin/news", labelAr: "الأخبار", labelEn: "News", icon: "Newspaper" },
    { href: "/admin/audit", labelAr: "سجل التدقيق", labelEn: "Audit", icon: "ScrollText" },
  ],
  admin: [
    { href: "/admin", labelAr: "نظرة عامة", labelEn: "Overview", icon: "LayoutDashboard" },
    { href: "/admin/users", labelAr: "المستخدمون", labelEn: "Users", icon: "Users" },
    { href: "/admin/approvals", labelAr: "الاعتمادات", labelEn: "Approvals", icon: "CheckCircle" },
    { href: "/admin/role-requests", labelAr: "طلبات الترقية", labelEn: "Role requests", icon: "UserCog" },
    { href: "/admin/tournaments", labelAr: "البطولات", labelEn: "Tournaments", icon: "Trophy" },
    { href: "/admin/events", labelAr: "الفعاليات", labelEn: "Events", icon: "CalendarDays" },
    { href: "/admin/results", labelAr: "النتائج", labelEn: "Results", icon: "ListChecks" },
    { href: "/admin/news", labelAr: "الأخبار", labelEn: "News", icon: "Newspaper" },
  ],
  coach: [
    { href: "/coach", labelAr: "نظرة عامة", labelEn: "Overview", icon: "LayoutDashboard" },
    { href: "/coach/athletes", labelAr: "متدربيّ", labelEn: "My Athletes", icon: "Users" },
    { href: "/coach/tournaments", labelAr: "بطولاتي", labelEn: "Tournaments", icon: "Trophy" },
    { href: "/coach/events", labelAr: "فعالياتي", labelEn: "Events", icon: "CalendarDays" },
    { href: "/coach/register", labelAr: "تسجيل في بطولة", labelEn: "Register", icon: "ClipboardList" },
    { href: "/coach/results", labelAr: "النتائج", labelEn: "Results", icon: "ListChecks" },
    { href: "/coach/courses", labelAr: "دوراتي", labelEn: "My Courses", icon: "GraduationCap" },
    { href: "/coach/posts", labelAr: "المنشورات", labelEn: "Posts", icon: "Newspaper" },
  ],
  judge: [
    { href: "/judge", labelAr: "نظرة عامة", labelEn: "Overview", icon: "LayoutDashboard" },
    { href: "/judge/tournaments", labelAr: "البطولات", labelEn: "Tournaments", icon: "Trophy" },
    { href: "/judge/events", labelAr: "الفعاليات", labelEn: "Events", icon: "CalendarDays" },
    { href: "/judge/scoring", labelAr: "التحكيم", labelEn: "Scoring", icon: "Crosshair" },
    { href: "/judge/disputes", labelAr: "الاعتراضات", labelEn: "Disputes", icon: "AlertTriangle" },
  ],
  athlete: [
    { href: "/athlete", labelAr: "نظرة عامة", labelEn: "Overview", icon: "LayoutDashboard" },
    { href: "/athlete/tournaments", labelAr: "بطولاتي", labelEn: "My Tournaments", icon: "Trophy" },
    { href: "/athlete/courses", labelAr: "دوراتي", labelEn: "My Courses", icon: "GraduationCap" },
    { href: "/athlete/certificates", labelAr: "الشهادات", labelEn: "Certificates", icon: "Award" },
    { href: "/athlete/membership", labelAr: "العضوية", labelEn: "Membership", icon: "IdCard" },
    { href: "/athlete/request-role", labelAr: "طلب ترقية", labelEn: "Request role", icon: "UserCog" },
  ],
};
