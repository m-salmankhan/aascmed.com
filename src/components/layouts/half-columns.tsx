import { App } from "./app";
import { NavBar } from "../header";
import React, { ReactNode } from "react";
import { Container } from "../containers";
import { Footer } from "../footer";
export { Columns, Column } from "./columns";

interface HalfColumnProps {
    children: ReactNode,
    className?: string
}
export const HalfColumnsLayout: React.FC<HalfColumnProps> = ({ children, className }) => {
    return (
        <App className={className} >
            <NavBar />
            <Container id={"main"}>
                {children}
            </Container>
            <Footer />
        </App>
    );
}
