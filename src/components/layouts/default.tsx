import { App } from "./app";
import { NavBar } from "../header";
import React, { ReactNode } from "react";
import { gridContainer } from "../../styles/grid";
import { Footer } from "../footer";

export const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <App>
            <NavBar />
            <div id={"main"}>
                {children}
            </div>
            <Footer />
        </App>
    );
}