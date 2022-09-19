import { NextSeo } from 'next-seo';
import { setEdgeHeader } from '@pantheon-systems/wordpress-kit';

import Layout from '../../components/layout';
import Post from '../../components/post';

import { getFooterMenu } from '../../lib/Menus';
import { getPostBySlug } from '../../lib/Posts';

export default function PostTemplate({ menuItems, post }) {
	return (
		<Layout footerMenu={menuItems}>
			<NextSeo
				title="Decoupled Next WordPress Demo"
				description="Generated by create next app."
			/>
			<Post post={post} />
		</Layout>
	);
}

export async function getServerSideProps({ params, res }) {
	const menuItems = await getFooterMenu();
	const { slug } = params;
	const post = await getPostBySlug(slug);
	setEdgeHeader({ res });

	if (!post) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			menuItems,
			post,
		},
	};
}
