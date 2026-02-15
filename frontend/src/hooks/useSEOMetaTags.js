import React from 'react';
import { Helmet } from 'react-helmet-async';

// This helper manages page-specific SEO meta tags for React SPA
export const useSEOMetaTags = (config) => {
  return (
    <Helmet>
      <title>{config.title} | BioMuseum</title>
      <meta name="description" content={config.description} />
      <meta property="og:title" content={config.title} />
      <meta property="og:description" content={config.description} />
      <meta property="og:url" content={config.url} />
      {config.keywords && <meta name="keywords" content={config.keywords} />}
      {config.schema && (
        <script type="application/ld+json">
          {JSON.stringify(config.schema)}
        </script>
      )}
      {config.canonical && <link rel="canonical" href={config.canonical} />}
    </Helmet>
  );
};

export default useSEOMetaTags;
