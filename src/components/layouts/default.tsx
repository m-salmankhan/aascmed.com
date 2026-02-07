import { App } from "./app";
import { NavBar } from "../header";
import React, { ReactNode } from "react";
import { Footer } from "../footer";

interface LayoutProps {
    children: ReactNode
    pageTitle?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, pageTitle }) => {
    return (
        <App pageTitle={pageTitle}>
            <NavBar />
            <div id={"main"}>
                {children}
            </div>
            <Footer />
        </App>
    );
}