<?php
/**
 * READ-ONLY extraction of the staff and commissioners from the WordPress site, for
 * importWordpressPeople.ts. Run it through extractPeople.sh (WP-CLI `eval-file`).
 *
 * Writes studio/scripts/data/wordpress/people.json (git-ignored): the raw posts, their featured
 * photo files, the department terms, and the department assignments stored on the LEGACY
 * `nlb_staff` posts. The current `staff` posts carry no department; the legacy posts (the previous
 * theme's post type, the same people) do, and are joined to the current ones by name in
 * people.ts. Nothing is written to WordPress.
 */
global $wpdb;

$people = array();
$posts  = get_posts(
	array(
		'post_type'   => array( 'staff', 'commissioner' ),
		'post_status' => 'any',
		'numberposts' => -1,
		'orderby'     => array( 'menu_order' => 'ASC', 'ID' => 'ASC' ),
	)
);
foreach ( $posts as $p ) {
	$thumb_id = get_post_thumbnail_id( $p->ID );
	$file     = $thumb_id ? get_attached_file( $thumb_id ) : '';
	$people[] = array(
		'wpId'      => (int) $p->ID,
		'type'      => $p->post_type,
		'status'    => $p->post_status,
		'name'      => $p->post_title,
		'slug'      => $p->post_name,
		'menuOrder' => (int) $p->menu_order,
		'jobTitle'  => (string) get_post_meta( $p->ID, 'job_title', true ),
		'termDate'  => (string) get_post_meta( $p->ID, 'nlb_v2_date', true ),
		'photo'     => $file
			? array(
				'attachmentId' => (int) $thumb_id,
				'path'         => $file,
				'exists'       => file_exists( $file ),
				'alt'          => (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ),
			)
			: null,
	);
}

$legacy = array();
$rows   = $wpdb->get_results(
	"SELECT p.ID, p.post_title, t.slug, t.name
	 FROM {$wpdb->posts} p
	 JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
	 JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'department'
	 JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
	 WHERE p.post_type = 'nlb_staff' AND p.post_status = 'publish'
	 ORDER BY p.ID"
);
foreach ( $rows as $r ) {
	$legacy[] = array(
		'wpId'       => (int) $r->ID,
		'name'       => $r->post_title,
		'department' => array( 'slug' => $r->slug, 'name' => $r->name ),
	);
}

$departments = array();
$rows        = $wpdb->get_results(
	"SELECT t.term_id, t.slug, t.name
	 FROM {$wpdb->terms} t
	 JOIN {$wpdb->term_taxonomy} tt ON tt.term_id = t.term_id AND tt.taxonomy = 'department'
	 ORDER BY t.term_id"
);
foreach ( $rows as $r ) {
	$departments[] = array( 'termId' => (int) $r->term_id, 'slug' => $r->slug, 'name' => $r->name );
}

$out = array(
	'source'                 => array(
		'siteUrl'     => get_option( 'siteurl' ),
		'extractedAt' => gmdate( 'c' ),
	),
	'people'                 => $people,
	'legacyStaffDepartments' => $legacy,
	'departments'            => $departments,
);

$dir = dirname( __FILE__ ) . '/../data/wordpress';
wp_mkdir_p( $dir );
file_put_contents( $dir . '/people.json', wp_json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
echo count( $people ) . " people, " . count( $legacy ) . " legacy department rows, " . count( $departments ) . " departments written.\n";
