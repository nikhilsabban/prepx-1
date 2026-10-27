import { SidebarNav } from "@/components/app/app-nav";
import { SearchButton } from "@/components/app/command-palette";

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 scrollbar-thin pt-5">
        <SearchButton className="w-full" />
        <SidebarNav />
      </div>
    </aside>
  );
}
