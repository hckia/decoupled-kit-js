import { NextSeo } from "next-seo";
import { isMultiLanguage } from "../../lib/isMultiLanguage";
import { getPreview } from "../../lib/getPreview";
import {
  getCurrentLocaleStore,
  globalDrupalStateAuthStores,
} from "../../lib/drupalStateContext";

import Article from "../../components/article.js";
import Layout from "../../components/layout";

export default function Home({ article, hrefLang }) {
  return (
    <Layout>
      <NextSeo
        title="Decoupled Next Drupal Demo"
        description="Generated by create next app."
        languageAlternates={hrefLang}
      />
      <Article article={article} />
    </Layout>
  );
}

export async function getStaticPaths(context) {
  // TODO - locale increases the complexity enough here that creating a usePaths
  // hook would be a good idea.
  // Get paths for each locale.
  const pathsByLocale = context.locales.map(async (locale) => {
    const store = getCurrentLocaleStore(locale, globalDrupalStateAuthStores);

    const articles = await store.getObject({
      objectName: "node--article",
      query: `
          {
            id
            path {
              alias
            }
          }
        `,
    });
    return articles.map((article) => {
      // matches everything after /articles/
      const match = article.path.alias.match(/^\/articles\/(.*)$/);
      const slug = match[1];

      return { params: { slug: [slug] }, locale: locale };
    });
  });

  // Resolve all promises returned as part of pathsByLocale.
  const paths = await Promise.all(pathsByLocale).then((values) => {
    // Flatten the array of arrays into a single array.
    return [].concat(...values);
  });

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps(context) {
  const { locales, locale } = context;
  const multiLanguage = isMultiLanguage(locales);
  const store = getCurrentLocaleStore(
    context.locale,
    globalDrupalStateAuthStores
  );
  store.params.clear();  
  store.params.addInclude(["field_media_image.field_media_image"]);
  
  const slug = `/articles/${context.params.slug[0]}`;
  // if preview, use preview endpoint and add to store.
  context.preview && await getPreview(context, "node--article");

  // If preview mode, get the preview data from the store, other wise fetch from the api.
  const article = await store.getObjectByPath({
    objectName: "node--article",
    // Prefix the slug with the current locale
    path: `${multiLanguage ? locale : ""}${slug}`,
    query: `
        {
          id
          title
          body
          path {
            alias
            langcode
          }
          field_media_image {
            field_media_image {
              uri {
                url
              }
            }
          }
        }
      `,
  });

  const origin = process.env.NEXT_PUBLIC_FRONTEND_URL;
  // Load all the paths for the current article.
  const paths = locales.map(async (locale) => {
    const localeStore = getCurrentLocaleStore(
      locale,
      globalDrupalStateAuthStores
    );
    const { path } = await localeStore.getObject({
      objectName: "node--article",
      id: article.id,
    });
    return path;
  });

  // Resolve all promises returned as part of paths
  // and prepare hrefLang.
  const hrefLang = await Promise.all(paths).then((values) => {
    return values.map((value) => {
      return {
        hrefLang: value.langcode,
        href: origin + "/" + value.langcode + value.alias,
      };
    });
  });

  return {
    props: {
      article,
      hrefLang,
      revalidate: 60,
    },
  };
}
