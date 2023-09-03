import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import { DynamicHeading, H1 } from "../components/headings";
import { Columns, MainCol, SideCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { ShareButtons } from "../components/social-media/share";
import { Contents, ContentsPageItem } from "../components/posts/contents";
import { Article } from "../components/posts/article";
import { ButtonList, ContactBanner, FAQ } from "../components/posts/shortcode-components";
import { SEO } from "../components/seo";
import { ReactNode } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { renderToString } from 'react-dom/server'
import { json } from "stream/consumers";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
interface FAQQuestionProps {
    className?: string
    heading_level: HeadingLevel
    question: string
    answer: string
}
const FAQQuestion = (props: FAQQuestionProps) =>
    <div className={props.className}>
        <DynamicHeading level={props.heading_level}>{props.question}</DynamicHeading>
        <div className="answer">
            <ReactMarkdown>
                {props.answer || ""}
            </ReactMarkdown>

        </div>
    </div>

interface Question {
    readonly question_heading_level: string | null
    readonly question: string | null
    readonly answer: string | null
}

interface FAQQuestionListProps {
    className?: string,
    questions: Question[] | null
}
const FAQQuestionList = (props: FAQQuestionListProps) => {
    if (props.questions === null) return <>No Frequently Asked Questions.</>

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": props.questions.map((question) => ({
            "@type": "Question",
            name: question.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: renderToString(
                    <ReactMarkdown>
                        {question.answer || ""}
                    </ReactMarkdown>
                )
            }
        }))
    }

    return (
        <FAQ className={props.className}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            {
                props.questions.map((question, idx) =>
                    <FAQQuestion
                        key={idx}
                        question={question.question || ""}
                        heading_level={parseInt(question.question_heading_level || "3") as HeadingLevel}
                        answer={question.answer || ""}
                    />
                )
            }
        </FAQ>
    )
}

const shortcodes = { Link, ButtonList, ContactBanner, FAQ };
const Condition = ({ data, children, location }: PageProps<Queries.ConditionPageQuery>) => {
    if ((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if ((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"
    const heading = data.mdx.frontmatter.heading || "Untitled"
    const tocItems = data.mdx.tableOfContents?.items as ContentsPageItem[];

    const faq = data.mdx.frontmatter.faq as Question[];

    return (
        <PrimarySecondaryColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/conditions/", "Conditions"],
                    [data.mdx?.fields?.slug, heading]
                ]} css={css({ marginTop: "3em" })} />
                <Article>
                    <H1><>{heading}</></H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />

                    <Columns>
                        <MainCol>
                            <MDXProvider components={shortcodes as any}>
                                {children}
                            </MDXProvider>

                            <FAQQuestionList questions={faq} />

                            <footer>
                                <ShareButtons pageTitle={title} path={location.pathname} />
                            </footer>
                        </MainCol>
                        <SideCol>
                            <Contents items={tocItems} />
                        </SideCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    );
}

export const Head = (props: HeadProps<Queries.ConditionPageQuery>) => {
    const title = props.data.mdx?.frontmatter?.title || "Untitled";
    const description = props.data.mdx?.frontmatter?.description || "";
    const image = props.data.mdx?.frontmatter?.thumbnail?.publicURL || undefined;

    return (
        <SEO description={description} slug={props.location.pathname} title={title} image={image}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"conditions"} />
        </SEO>
    )
}



export const query = graphql`
  query ConditionPage($id: String) {
    mdx(id: {eq: $id}) {
      id
      tableOfContents(maxDepth: 3)
      body
      fields {
        slug
      }
      frontmatter {
        description
        title
        heading
        thumbnail {
            childImageSharp {
                gatsbyImageData(width: 800)
            }
            publicURL
        }
        faq {
            question_heading_level
            question
            answer
        }
      }
    }
  }
`

export default Condition