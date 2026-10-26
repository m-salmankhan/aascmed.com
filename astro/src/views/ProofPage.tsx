import { Global, css } from '@emotion/react';
import { HeroBase } from '../../../src/components/header/hero-base';
import { Columns, Column } from '../../../src/components/layouts/columns';
import { stylesGlobal } from '../../../src/styles/global';
import { HeroImage } from '../../../src/components/media/image';
import type { MediaDescriptor } from '../../../src/shared/content/models';

/** Draft title and whether this render used the local fixture or Strapi. */
export type ProofDraft = { title: string; source: 'fixture' | 'strapi' };

/** Serializable values used by the Stage 1 Astro rendering proof. */
export type ProofPageProps = {
  /** Display label for the static or server-rendered build target. */
  target: string;
  /** Preview title and provenance selected by the proof loader. */
  draft: ProofDraft;
  /** Hero image source and alternative text shared with the React renderer. */
  media: MediaDescriptor;
};

/** Render the proof page from its target label, draft preview, and hero media.
 * @param props Build target label, preview data, and shared hero media descriptor.
 * @returns The server-renderable proof page composition.
 */
export default function ProofPage({ target, draft, media }: ProofPageProps) {
  return <>
    <Global styles={stylesGlobal} />
    <HeroBase heading="A reusable, styled first paint" navigation={<nav aria-label="Main navigation" css={css`position:relative;z-index:1`}><a href="#main">AASC · care for every breath</a></nav>} image={<HeroImage image={media} draggable={false} />}>
      <p css={css`text-transform:uppercase; letter-spacing:.12em; font-weight:bold;`}>Astro migration proof</p>
      <p>Real static media, server-rendered content, and an independent hydrated control.</p>
    </HeroBase>
    <main id="main" css={css`max-width:1120px; margin:2.5rem auto; padding:0 1.5rem;`}>
      <p css={css`color:#526b70;`}>Build target: <strong>{target}</strong></p>
      <Columns className="proof-columns">
        <Column><article css={css`background:white; padding:1.5rem; border-radius:.5rem; box-shadow:0 2px 12px #173b4318;`}><h2>Saved draft preview</h2><p data-draft-source={draft.source}>{draft.title}</p><small>Source: {draft.source}; fetched per SSR request when configured.</small></article></Column>
        <Column><article css={css`background:white; padding:1.5rem; border-radius:.5rem; box-shadow:0 2px 12px #173b4318;`}><h2>Layout selector check</h2><p>The second column uses the shared responsive half-column rule.</p></article></Column>
      </Columns>
      <p css={css`margin-top:1rem; color:#526b70;`}>The shared half-column component uses a type selector because Emotion inserts sibling style tags during SSR.</p>
    </main>
  </>;
}
