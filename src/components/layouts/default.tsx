import { App } from "./app";
import { NavBar } from "../header";
import React, { ReactNode } from "react";
import { Footer } from "../footer";

export const Layout = ({ children }: { children: ReactNode }): React.ReactElement => {
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