import { HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { NotFoundView } from "../views/fixed-archive";

const NotFoundPage = (_props: PageProps<Queries.PracticesArchiveQuery>) => <NotFoundView />;

export const Head = (props: HeadProps) => <SEO description="This page could not be found." slug={props.location.pathname} title="404 Not Found">
  <meta name="og:type" content="website" />
</SEO>;

export default NotFoundPage;
