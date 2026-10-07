<?php
/**
 * READ-ONLY extraction of the FAQs from the WordPress site, for importWordpressFaqs.ts. Run it
 * through extractFaqs.sh (WP-CLI `eval-file`).
 *
 * Writes studio/scripts/data/wordpress/faqs.json (git-ignored): the `faq` posts (title, raw
 * `post_content`, `menu_order`, status), their `faq_category` terms, and every category with its
 * order (ACF `term_order` on the term). Queries the tables directly, so it does not depend on the
 * theme registering the taxonomy. Only the current `faq` post type is read; the previous theme's
 * `nlb_faq` posts are test content and are left out. Nothing is written to WordPress.
 */
global $wpdb;

$faqs  = array();
$posts = $wpdb->get_results(
	"SELECT ID, post_status, post_title, post_content, menu_order
	 FROM {$wpdb->posts}
	 WHERE post_type = 'faq' AND post_status NOT IN ('trash', 'auto-draft')
	 ORDER BY menu_order, ID"
);
foreach ( $posts as $p ) {
	$terms = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT t.slug, t.name
			 FROM {$wpdb->term_relationships} tr
			 JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'faq_category'
			 JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
			 WHERE tr.object_id = %d
			 ORDER BY t.term_id",
			$p->ID
		)
	);
	$categories = array();
	foreach ( $terms as $t ) {
		$categories[] = array( 'slug' => $t->slug, 'name' => $t->name );
	}
	$faqs[] = array(
		'wpId'       => (int) $p->ID,
		'status'     => $p->post_status,
		'question'   => $p->post_title,
		'menuOrder'  => (int) $p->menu_order,
		'content'    => $p->post_content,
		'categories' => $categories,
	);
}

$categories = array();
$rows       = $wpdb->get_results(
	"SELECT t.term_id, t.slug, t.name
	 FROM {$wpdb->terms} t
	 JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'faq_category'
	 ORDER BY t.term_id"
);
foreach ( $rows as $r ) {
	$order        = $wpdb->get_var(
		$wpdb->prepare( "SELECT meta_value FROM {$wpdb->termmeta} WHERE term_id = %d AND meta_key = 'term_order' LIMIT 1", $r->term_id )
	);
	$categories[] = array(
		'termId'    => (int) $r->term_id,
		'slug'      => $r->slug,
		'name'      => $r->name,
		'termOrder' => is_numeric( $order ) ? (int) $order : 0,
	);
}

$out = array(
	'source'     => array(
		'siteUrl'     => get_option( 'siteurl' ),
		'extractedAt' => gmdate( 'c' ),
	),
	'faqs'       => $faqs,
	'categories' => $categories,
);

$dir = dirname( __DIR__ ) . '/data/wordpress';
if ( ! is_dir( $dir ) ) {
	mkdir( $dir, 0775, true );
}
file_put_contents( $dir . '/faqs.json', wp_json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
echo 'Wrote ' . count( $faqs ) . ' FAQs and ' . count( $categories ) . " categories to $dir/faqs.json\n";
