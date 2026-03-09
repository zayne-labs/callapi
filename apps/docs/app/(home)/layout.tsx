import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

function Layout({ children }: LayoutProps<"/">) {
	return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}

export default Layout;
