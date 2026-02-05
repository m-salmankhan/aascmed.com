import React from "react";
import { StrapiBlocksRenderer } from "./blocks-renderer";
import { DynamicHeading, H2 } from "../headings";
import { FAQ as FAQWrapper } from "../posts/shortcode-components";

// Helper to extract plain text from Strapi blocks for FAQ structured data
function extractTextFromBlocks(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    return blocks.map(block => {
        if (block.children) {
            return block.children.map((child: any) => child.text || '').join('');
        }
        return '';
    }).join('\n');
}

// FAQ Question component
interface FAQQuestionProps {
    className?: string
    question: string
    answer: any[] // Strapi blocks content
}
const FAQQuestion = (props: FAQQuestionProps) =>
    <div className={props.className}>
        <DynamicHeading level={3}>{props.question}</DynamicHeading>
        <div className="answer">
            <StrapiBlocksRenderer content={props.answer} />
        </div>
    </div>

// Question interface
interface Question {
    readonly question: string | null
    readonly answer: any[] | null
}

interface StrapiFAQProps {
    className?: string
    questions: Question[] | null
}

/**
 * Renders a Strapi FAQ component with structured data for SEO.
 */
export const StrapiFAQ: React.FC<StrapiFAQProps> = ({ className, questions }) => {
    if (!questions || questions.length === 0) return null;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions.map((question) => ({
            "@type": "Question",
            name: question.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: extractTextFromBlocks(question.answer || [])
            }
        }))
    }

    return (
        <section id="faq">
        <H2>Frequently Asked Questions</H2>

        <FAQWrapper className={className}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            {
                questions.map((question, idx) =>
                    <FAQQuestion
                        key={idx}
                        question={question.question || ""}
                        answer={question.answer || []}
                    />
                )
            }
        </FAQWrapper>
        </section>

    )
}

export default StrapiFAQ;
