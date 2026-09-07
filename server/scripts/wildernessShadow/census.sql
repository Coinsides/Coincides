-- S0 report section four, promoted to a read-only executable query.
-- S3 additions: raw placement identities; parameterized diagnostic threshold (never enables adoption).
WITH
o AS (SELECT * FROM canvas_objects WHERE user_id=:scope_user_id),
p AS (SELECT * FROM canvas_placements WHERE user_id=:scope_user_id),
m AS (SELECT * FROM content_mounts WHERE user_id=:scope_user_id),
n AS (
  SELECT id AS note_id FROM notes WHERE user_id=:scope_user_id
  UNION SELECT note_id FROM o UNION SELECT note_id FROM p UNION SELECT note_id FROM m
),
pl AS (
  SELECT p.*, o.kind, o.status AS object_status,
    CASE WHEN json_valid(o.source_json) THEN o.source_json ELSE '{}' END AS safe_source,
    (SELECT COUNT(*) FROM m WHERE m.object_id=p.object_id AND m.note_id=p.note_id) AS mounts,
    CASE WHEN json_valid(p.metadata) THEN p.metadata ELSE '{}' END AS safe_meta
  FROM p LEFT JOIN o ON o.id=p.object_id AND o.note_id=p.note_id
),
ol AS (
  SELECT o.*, (SELECT COUNT(*) FROM p WHERE p.object_id=o.id AND p.note_id=o.note_id) AS placements,
    (SELECT COUNT(*) FROM m WHERE m.object_id=o.id AND m.note_id=o.note_id) AS mounts,
    (SELECT COUNT(DISTINCT surface) FROM p WHERE p.object_id=o.id AND p.note_id=o.note_id) AS surfaces
  FROM o
),
ml AS (
  SELECT m.*, o.kind, o.status AS object_status,
    (SELECT COUNT(*) FROM p WHERE p.object_id=m.object_id AND p.note_id=m.note_id) AS placements,
    (SELECT COUNT(DISTINCT surface) FROM p WHERE p.object_id=m.object_id AND p.note_id=m.note_id) AS surfaces,
    (SELECT MIN(surface) FROM p WHERE p.object_id=m.object_id AND p.note_id=m.note_id) AS one_surface
  FROM m LEFT JOIN o ON o.id=m.object_id AND o.note_id=m.note_id
),
l0 AS (
  SELECT l.*, b.status AS block_status,
    CASE WHEN json_valid(l.display_overrides_json) THEN l.display_overrides_json ELSE '{}' END AS j,
    json_valid(l.display_overrides_json) AS valid_json
  FROM note_block_placements l JOIN notes nt ON nt.id=l.note_id AND nt.user_id=:scope_user_id
  LEFT JOIN note_blocks b ON b.id=l.block_id AND b.user_id=nt.user_id
),
l1 AS (
  SELECT l0.*, json_type(j,'$.better_notebook_layout') AS layout_type,
    CASE WHEN json_type(j,'$.better_notebook_layout')='object'
      THEN json_extract(j,'$.better_notebook_layout') ELSE '{}' END AS layout,
    (SELECT COUNT(*) FROM pl WHERE pl.id=l0.id AND pl.note_id=l0.note_id) AS same_id,
    (SELECT COUNT(*) FROM pl WHERE pl.id=l0.id AND pl.note_id=l0.note_id
      AND pl.kind='paragraph_block_projection'
      AND EXISTS (SELECT 1 FROM m WHERE m.object_id=pl.object_id AND m.note_id=pl.note_id
        AND m.target_kind='note_block' AND m.target_id=l0.block_id)) AS entity_any,
    (SELECT COUNT(*) FROM pl WHERE pl.id=l0.id AND pl.note_id=l0.note_id
      AND pl.kind='paragraph_block_projection' AND pl.object_status='active'
      AND l0.block_status='active'
      AND EXISTS (SELECT 1 FROM m WHERE m.object_id=pl.object_id AND m.note_id=pl.note_id
        AND m.target_kind='note_block' AND m.target_id=l0.block_id)) AS entity_active,
    (SELECT COUNT(*) FROM pl WHERE pl.note_id=l0.note_id AND pl.id<>l0.id
      AND EXISTS (SELECT 1 FROM m WHERE m.object_id=pl.object_id AND m.note_id=pl.note_id
        AND m.target_kind='note_block' AND m.target_id=l0.block_id)) AS other_entity_candidates
  FROM l0
),
fr0 AS (
  SELECT e.note_id,e.frame_id,e.page_stack_id,
    COUNT(p.id) AS matches,MIN(p.x) AS fx,MIN(p.y) AS fy,MIN(p.width) AS fw,MIN(p.height) AS fh,
    MIN(p.rotation) AS rotation,
    CASE WHEN json_valid(e.content_inset_json) THEN e.content_inset_json ELSE '{}' END AS j
  FROM page_frame_extensions e JOIN o ON o.id=e.object_id AND o.note_id=e.note_id
    AND o.kind='page_frame' AND o.status='active'
  LEFT JOIN p ON p.object_id=o.id AND p.note_id=o.note_id
  WHERE e.user_id=:scope_user_id
  GROUP BY e.note_id,e.frame_id,e.page_stack_id,e.content_inset_json
),
fr1 AS (
  SELECT *,json_extract(j,'$.left') AS il,json_extract(j,'$.right') AS ir,
    json_extract(j,'$.top') AS it,json_extract(j,'$.bottom') AS ib FROM fr0
),
fr AS (
  SELECT *,fx+il AS ox,fy+it AS oy,fw-il-ir AS cw,fh-it-ib AS ch,
    CASE WHEN matches<>1 THEN 'frame_placement_count'
      WHEN typeof(fx) NOT IN ('integer','real') OR typeof(fy) NOT IN ('integer','real')
        OR typeof(fw) NOT IN ('integer','real') OR typeof(fh) NOT IN ('integer','real')
        THEN 'frame_geometry_unknown'
      WHEN abs(fx)+abs(fw)>1.7976931348623157e308 OR abs(fy)+abs(fh)>1.7976931348623157e308
        THEN 'frame_geometry_nonfinite'
      WHEN typeof(il) NOT IN ('integer','real') OR typeof(ir) NOT IN ('integer','real')
        OR typeof(it) NOT IN ('integer','real') OR typeof(ib) NOT IN ('integer','real')
        THEN 'inset_unknown'
      WHEN il<0 OR ir<0 OR it<0 OR ib<0 OR fw-il-ir<=0 OR fh-it-ib<=0 THEN 'invalid_content_rect'
      WHEN rotation IS NULL OR rotation<>0 THEN 'rotated_frame'
      ELSE 'resolved' END AS frame_state
  FROM fr1
),
b AS (
  SELECT 'placement' AS unit,id,note_id,kind,object_status AS status,x,y,width,height,rotation,
    frame_id,surface,boundary_role,json_extract(safe_meta,'$.layout_policy.coordinate_space') AS tag,
    json_valid(metadata) AS metadata_valid,
    CASE WHEN json_extract(safe_source,'$.imported_from')='display_overrides_json.better_notebook_layout'
      THEN '035_receipt_survives' ELSE 'writer_history_unknown' END AS history_hint
  FROM pl WHERE kind IS NULL OR kind<>'page_frame'
  UNION ALL
  SELECT 'legacy',id,note_id,'legacy_block',block_status,
    json_extract(layout,'$.x'),json_extract(layout,'$.y'),json_extract(layout,'$.width'),
    json_extract(layout,'$.height'),COALESCE(json_extract(layout,'$.rotation'),0),
    json_extract(layout,'$.frame_id'),json_extract(layout,'$.surface'),
    json_extract(layout,'$.boundary_role'),json_extract(layout,'$.coordinate_space'),valid_json,'legacy_layout_present'
  FROM l1 WHERE layout_type='object'
),
bi AS (
  SELECT b.*,f.ox,f.oy,COALESCE(f.frame_state,'missing_or_unbound') AS binding_state,
    CASE WHEN f.frame_state='resolved' THEN b.y>f.fh END AS y_gt_outer_height,
    CASE WHEN f.frame_state='resolved' THEN b.y<0 OR b.y+b.height>f.ch END AS local_y_outside_content,
    CASE WHEN f.frame_state='resolved' THEN b.y>=f.oy AND b.y<f.oy+f.ch END AS raw_world_y_start_in_content,
    CASE WHEN f.frame_state<>'resolved' OR f.frame_state IS NULL THEN 'unknown'
      WHEN f.oy=0 THEN 'origin_y_zero' ELSE 'origin_y_nonzero' END AS origin_bucket,
    c.primary_frame_id,
    (SELECT COUNT(*) FROM fr WHERE fr.note_id=b.note_id AND frame_state='resolved') AS valid_frames,
    (SELECT COUNT(*) FROM fr WHERE fr.note_id=b.note_id AND frame_state<>'resolved')
      + (SELECT COUNT(*) FROM o fo WHERE fo.note_id=b.note_id AND fo.kind='page_frame'
        AND fo.status='active' AND NOT EXISTS (SELECT 1 FROM page_frame_extensions e
          WHERE e.user_id=:scope_user_id AND e.note_id=fo.note_id AND e.object_id=fo.id)) AS unknown_frames,
    CASE WHEN surface='tray' THEN 'tray_no_geometry'
      WHEN typeof(x) NOT IN ('integer','real') OR typeof(y) NOT IN ('integer','real')
        OR typeof(width) NOT IN ('integer','real') OR typeof(height) NOT IN ('integer','real')
        OR width<=0 OR height<=0 THEN 'invalid_geometry'
      WHEN abs(x)+width>1.7976931348623157e308 OR abs(y)+height>1.7976931348623157e308
        OR width*height>1.7976931348623157e308 THEN 'nonfinite_geometry'
      WHEN b.rotation IS NULL OR b.rotation<>0 THEN 'rotated_object'
      ELSE 'resolved' END AS geometry_state
  FROM b LEFT JOIN fr f ON f.note_id=b.note_id AND f.frame_id=b.frame_id
  LEFT JOIN canvas_page_collections c ON c.user_id=:scope_user_id AND c.note_id=b.note_id
),
ex AS (SELECT 'world' AS interpretation UNION ALL SELECT 'local' UNION ALL SELECT 'mixed'),
w0 AS (
  SELECT bi.*,ex.interpretation,
    CASE WHEN geometry_state<>'resolved' THEN geometry_state
      WHEN interpretation<>'world' AND binding_state<>'resolved' THEN 'origin_unknown'
      WHEN interpretation<>'world' AND abs(x)+abs(ox)>1.7976931348623157e308 THEN 'projection_nonfinite'
      WHEN interpretation='local' AND abs(y)+abs(oy)>1.7976931348623157e308 THEN 'projection_nonfinite'
      ELSE 'resolved' END AS interpretation_state,
    CASE WHEN interpretation='world' THEN x ELSE x+ox END AS wx,
    CASE WHEN interpretation='local' THEN y+oy ELSE y END AS wy
  FROM bi CROSS JOIN ex
),
w AS (
  SELECT *,CASE WHEN interpretation_state='resolved' THEN wx END AS world_x,
    CASE WHEN interpretation_state='resolved' THEN wy END AS world_y FROM w0
),
h0 AS (
  SELECT w.unit,w.id,w.note_id,w.interpretation,f.frame_id,f.page_stack_id,
    f.ox,f.oy,f.cw,f.ch,w.world_x AS x,w.world_y AS y,w.width,w.height,
    MAX(0,MIN(w.world_x+w.width,f.ox+f.cw)-MAX(w.world_x,f.ox))
      * MAX(0,MIN(w.world_y+w.height,f.oy+f.ch)-MAX(w.world_y,f.oy)) AS overlap
  FROM w JOIN fr f ON f.note_id=w.note_id AND f.frame_state='resolved'
  WHERE w.interpretation_state='resolved'
),
h AS (
  SELECT *,overlap/(width*height) AS ratio,
    CASE WHEN x>=ox AND y>=oy AND x+width<=ox+cw AND y+height<=oy+ch THEN 'inside'
      WHEN overlap>0 THEN 'crossing' ELSE 'outside' END AS rect_role,
    CASE WHEN x+width/2>=ox AND x+width/2<=ox+cw AND y+height/2>=oy AND y+height/2<=oy+ch THEN 'inside'
      WHEN overlap>0 THEN 'crossing' ELSE 'outside' END AS center_role,
    CASE WHEN x+width<=ox OR x>=ox+cw THEN 'outside'
      WHEN x>=ox AND x+width<=ox+cw THEN 'inside' ELSE 'crossing' END AS horizontal_role,
    CASE WHEN width>cw AND height>ch THEN 'both' WHEN width>cw THEN 'width'
      WHEN height>ch THEN 'height' ELSE 'no' END AS oversize
  FROM h0
),
g0 AS (
  SELECT w.*,
    (SELECT COUNT(*) FROM h WHERE h.unit=w.unit AND h.id=w.id AND h.interpretation=w.interpretation AND overlap>0) AS intersect_count,
    (SELECT COUNT(DISTINCT COALESCE(page_stack_id,'<unstacked>')) FROM h WHERE h.unit=w.unit AND h.id=w.id AND h.interpretation=w.interpretation AND overlap>0) AS intersect_stacks,
    (SELECT MAX(ratio) FROM h WHERE h.unit=w.unit AND h.id=w.id AND h.interpretation=w.interpretation) AS max_ratio,
    (SELECT group_concat(frame_id || '@' || COALESCE(page_stack_id,'<unstacked>') || ':' || rect_role,'|')
      FROM (SELECT * FROM h ORDER BY frame_id) hh WHERE hh.unit=w.unit AND hh.id=w.id AND hh.interpretation=w.interpretation AND overlap>0) AS page_signature,
    (SELECT json_group_array(json_object('frame',frame_id,'stack',page_stack_id,'ratio',ratio,'rect',rect_role,'center',center_role,'horizontal',horizontal_role))
      FROM (SELECT * FROM h ORDER BY frame_id) hh WHERE hh.unit=w.unit AND hh.id=w.id AND hh.interpretation=w.interpretation) AS page_scores,
    ph.ratio AS primary_ratio,ph.oversize,ph.rect_role AS primary_rect_role,
    ph.center_role AS primary_center_role,ph.horizontal_role AS primary_horizontal_role,
    bh.rect_role AS bound_rect_role,bh.center_role AS bound_center_role,bh.horizontal_role AS bound_horizontal_role
  FROM w LEFT JOIN h ph ON ph.unit=w.unit AND ph.id=w.id AND ph.interpretation=w.interpretation AND ph.frame_id=w.primary_frame_id
  LEFT JOIN h bh ON bh.unit=w.unit AND bh.id=w.id AND bh.interpretation=w.interpretation AND bh.frame_id=w.frame_id
),
g AS (
  SELECT *,CASE WHEN primary_ratio IS NULL THEN 'unknown' WHEN primary_ratio=0 THEN '0'
    WHEN primary_ratio<0.5 THEN '(0,.5)' WHEN primary_ratio=0.5 THEN '.5'
    WHEN primary_ratio<1 THEN '(.5,1)' ELSE '1' END AS overlap_bucket,
    (SELECT COUNT(*) FROM h WHERE h.unit=g0.unit AND h.id=g0.id AND h.interpretation=g0.interpretation
      AND h.ratio=g0.max_ratio AND h.ratio>0) AS best_ties,
    CASE WHEN interpretation_state<>'resolved' THEN interpretation_state
      WHEN unknown_frames>0 THEN 'incomplete_frame_inventory'
      WHEN valid_frames=0 THEN 'no_valid_frames'
      WHEN intersect_count=0 THEN 'no_intersection' WHEN intersect_count=1 THEN 'one_frame'
      WHEN intersect_stacks>1 THEN 'multiple_stacks' ELSE 'multiple_pages_one_stack' END AS page_state,
    CASE WHEN unit='legacy' THEN 'legacy_frozen'
      WHEN kind IS NULL OR status<>'active' THEN 'review_identity_or_status'
      WHEN surface<>'canvas_workspace' THEN 'retain_other_surface'
      WHEN kind<>'paragraph_block_projection' THEN 'tray_object'
      WHEN boundary_role='outside' THEN 'tray_outside_block'
      WHEN boundary_role='crossing' AND primary_ratio>=:adoption_threshold THEN 'threshold_met_diagnostic_only'
      WHEN boundary_role='crossing' AND primary_ratio<:adoption_threshold THEN 'threshold_not_met_diagnostic_only'
      ELSE 'review_unknown' END AS route_candidate
  FROM g0
),
diff AS (
  SELECT unit,id,note_id,SUM(interpretation_state='resolved') AS resolved_interpretations,
    COUNT(DISTINCT CASE WHEN interpretation_state='resolved' THEN COALESCE(page_signature,'<none>') END) AS page_variants
  FROM g GROUP BY unit,id,note_id
),
denom AS (
  SELECT n.note_id,
    (SELECT COUNT(*) FROM p WHERE p.note_id=n.note_id) AS placements,
    (SELECT COUNT(*) FROM o WHERE o.note_id=n.note_id) AS objects,
    (SELECT COUNT(*) FROM m WHERE m.note_id=n.note_id) AS mounts,
    (SELECT COUNT(*) FROM l1 WHERE l1.note_id=n.note_id) AS legacy_rows,
    (SELECT COUNT(*) FROM pl WHERE pl.note_id=n.note_id AND kind='page_frame') AS frame_placements,
    (SELECT COUNT(*) FROM pl WHERE pl.note_id=n.note_id AND kind IS NULL) AS missing_object_placements,
    (SELECT COUNT(*) FROM ol WHERE ol.note_id=n.note_id AND placements=0) AS unplaced_objects,
    (SELECT COUNT(*) FROM ml WHERE ml.note_id=n.note_id AND placements=0) AS unplaced_mounts,
    (SELECT COUNT(*) FROM ol WHERE ol.note_id=n.note_id AND placements>1) AS multi_placement_objects,
    (SELECT COUNT(*) FROM l1 WHERE l1.note_id=n.note_id AND layout_type='object' AND entity_any=0 AND same_id=0 AND other_entity_candidates=0) AS legacy_only,
    (SELECT COUNT(*) FROM l1 WHERE l1.note_id=n.note_id AND layout_type='object' AND entity_any=0 AND (same_id>0 OR other_entity_candidates>0)) AS legacy_ambiguous,
    (SELECT COUNT(*) FROM l1 WHERE l1.note_id=n.note_id AND layout_type='object' AND entity_any>0) AS dual_any,
    (SELECT COUNT(*) FROM l1 WHERE l1.note_id=n.note_id AND layout_type='object' AND entity_active>0) AS dual_active
  FROM n
)
SELECT json_object(
 'denominators',json((SELECT json_group_array(json_object('note',note_id,'placement',placements,'object',objects,'mount',mounts,
   'legacy_rows',legacy_rows,'frame_placements',frame_placements,'missing_object_placements',missing_object_placements,
   'unplaced_objects',unplaced_objects,'unplaced_mounts',unplaced_mounts,'multi_placement_objects',multi_placement_objects,
   'legacy_only',legacy_only,'legacy_ambiguous',legacy_ambiguous,'dual_any',dual_any,'dual_active',dual_active)) FROM denom)),
 'unscopable_legacy_note_rows', (SELECT COUNT(*) FROM note_block_placements l WHERE NOT EXISTS (SELECT 1 FROM notes nt WHERE nt.id=l.note_id)),
 'note_matrix',json((SELECT json_group_array(json_object('note',d.note_id,
   'inside_blocks',(SELECT COUNT(*) FROM pl WHERE pl.note_id=d.note_id AND kind='paragraph_block_projection' AND boundary_role='inside'),
   'crossing_blocks',(SELECT COUNT(*) FROM pl WHERE pl.note_id=d.note_id AND kind='paragraph_block_projection' AND boundary_role='crossing'),
   'outside_blocks',(SELECT COUNT(*) FROM pl WHERE pl.note_id=d.note_id AND kind='paragraph_block_projection' AND boundary_role='outside'),
   'other_boundary_blocks',(SELECT COUNT(*) FROM pl WHERE pl.note_id=d.note_id AND kind='paragraph_block_projection' AND boundary_role NOT IN ('inside','crossing','outside')),
   'drawing_objects',(SELECT COUNT(*) FROM ol WHERE ol.note_id=d.note_id AND kind NOT IN ('paragraph_block_projection','page_frame')),
   'wilderness_drawing_objects',(SELECT COUNT(*) FROM ol WHERE ol.note_id=d.note_id AND kind NOT IN ('paragraph_block_projection','page_frame')
     AND EXISTS (SELECT 1 FROM p WHERE p.object_id=ol.id AND p.note_id=ol.note_id AND p.surface='canvas_workspace')),
   'mounts',d.mounts,'wilderness_only_mounts',(SELECT COUNT(*) FROM ml WHERE ml.note_id=d.note_id AND surfaces=1 AND one_surface='canvas_workspace'),
   'mixed_surface_mounts',(SELECT COUNT(*) FROM ml WHERE ml.note_id=d.note_id AND surfaces>1),
   'before',json_object('placement',d.placements,'object',d.objects,'mount',d.mounts),
   'after',NULL,'conservation','not_executed')) FROM denom d)),
 'stored_matrix',json((SELECT json_group_array(json_object('note',note_id,'kind',kind,'status',object_status,'surface',surface,'boundary',boundary_role,'n',n))
   FROM (SELECT note_id,kind,object_status,surface,boundary_role,COUNT(*) AS n FROM pl GROUP BY note_id,kind,object_status,surface,boundary_role))),
 'placement_inventory',json((SELECT json_group_array(json_object('note',note_id,'id',id,'object',object_id,'kind',kind,'status',object_status,'surface',surface,'boundary',boundary_role)) FROM pl)),
 'object_inventory',json((SELECT json_group_array(json_object('note',note_id,'id',id,'kind',kind,'status',status,'placements',placements,'mounts',mounts,'surfaces',surfaces)) FROM ol)),
 'mount_inventory',json((SELECT json_group_array(json_object('note',note_id,'id',id,'object',object_id,'target_kind',target_kind,'object_kind',kind,'status',object_status,
   'placements',placements,'surfaces',surfaces,'surface_state',CASE WHEN placements=0 THEN 'unplaced' WHEN surfaces>1 THEN 'mixed' ELSE one_surface END)) FROM ml)),
 'legacy_inventory',json((SELECT json_group_array(json_object('note',note_id,'id',id,'valid_json',valid_json,'layout_type',layout_type,
   'block_status',block_status,'same_id',same_id,'entity_any',entity_any,'entity_active',entity_active,'other_entity_candidates',other_entity_candidates)) FROM l1)),
 'frame_inventory',json((SELECT json_group_array(json_object('note',note_id,'id',frame_id,'stack',page_stack_id,'matches',matches,'state',frame_state)) FROM fr)),
 'geometry',json((SELECT json_group_array(json_object('unit',unit,'note',note_id,'id',id,'kind',kind,'status',status,'tag',tag,'metadata_valid',metadata_valid,
   'history_hint',history_hint,'origin_bucket',origin_bucket,'y_gt_outer_height',y_gt_outer_height,
   'local_y_outside_content',local_y_outside_content,'raw_world_y_start_in_content',raw_world_y_start_in_content,
   'stored_surface',surface,'stored_boundary',boundary_role,'frame',frame_id,'binding',binding_state,'primary',primary_frame_id,'unknown_frames',unknown_frames,
   'interpretation',interpretation,'state',interpretation_state,'x',world_x,'y',world_y,'page_state',page_state,'page_signature',page_signature,
   'page_scores',json(page_scores),'best_ties',best_ties,'primary_ratio',primary_ratio,'overlap_bucket',overlap_bucket,'oversize',oversize,
   'primary_rect',primary_rect_role,'primary_center',primary_center_role,'primary_horizontal',primary_horizontal_role,
   'bound_rect',bound_rect_role,'bound_center',bound_center_role,'bound_horizontal',bound_horizontal_role,
   'stored_vs_rect',CASE WHEN bound_rect_role IS NOT NULL AND boundary_role IS NOT NULL THEN boundary_role<>bound_rect_role END,
   'stored_vs_center',CASE WHEN bound_center_role IS NOT NULL AND boundary_role IS NOT NULL THEN boundary_role<>bound_center_role END,
   'stored_vs_horizontal',CASE WHEN bound_horizontal_role IS NOT NULL AND boundary_role IS NOT NULL THEN boundary_role<>bound_horizontal_role END,
   'route_candidate',route_candidate)) FROM g)),
 'interpretation_differences',json((SELECT json_group_array(json_object('unit',unit,'note',note_id,'id',id,'resolved',resolved_interpretations,'page_variants',page_variants)) FROM diff)),
 'route_distribution',json((SELECT json_group_array(json_object('note',note_id,'unit',unit,'interpretation',interpretation,'candidate',route_candidate,'n',n))
   FROM (SELECT note_id,unit,interpretation,route_candidate,COUNT(*) AS n FROM g GROUP BY note_id,unit,interpretation,route_candidate))),
 'distribution',json((SELECT json_group_array(json_object('note',note_id,'unit',unit,'interpretation',interpretation,'kind',kind,'tag',tag,
   'state',interpretation_state,'overlap',overlap_bucket,'oversize',oversize,'boundary_diff',boundary_diff,'n',n))
   FROM (SELECT note_id,unit,interpretation,kind,tag,interpretation_state,overlap_bucket,oversize,
     CASE WHEN bound_rect_role IS NOT NULL AND boundary_role IS NOT NULL THEN boundary_role<>bound_rect_role END AS boundary_diff,COUNT(*) AS n
     FROM g GROUP BY note_id,unit,interpretation,kind,tag,interpretation_state,overlap_bucket,oversize,boundary_diff)))
) AS census_json;
