import React, { useEffect, useRef } from 'react';
import MindMap from 'simple-mind-map';

/**
 * SimpleMindMapViewer
 * Mengintegrasikan engine resmi wanglin2/mind-map (simple-mind-map)
 * Menghasilkan kurva organik, percabangan pohon hirarkis interaktif, tema profesional,
 * dan fitur zoom, pan, serta navigasi mind map sejati.
 */
export const SimpleMindMapViewer = ({ nodes, edges }) => {
  const containerRef = useRef(null);
  const mindMapInstance = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Ekstrak data mindmap dari nodes diagram
    const mmNodes = nodes.filter((n) => n.type === 'mindmapNode');
    
    // Temukan root node (level 0 atau node pertama)
    const root = mmNodes.find((n) => n.data?.level === 0 || !n.data?.parent_id) || mmNodes[0];
    
    let treeData = {
      data: {
        text: 'Topik Utama Rencana',
      },
      children: [],
    };

    if (root) {
      const rootText = root.data?.label || 'Topik Utama';
      const rootId = root.id;

      // Kumpulkan cabang-cabang (level 1)
      const branches = mmNodes.filter(
        (n) => n.id !== rootId && (n.data?.level === 1 || n.data?.parent_id === rootId)
      );

      const branchItems = branches.map((b) => {
        const branchId = b.id;
        // Kumpulkan sub-cabang (level 2)
        const subBranches = mmNodes.filter(
          (n) => n.id !== branchId && n.id !== rootId && (n.data?.parent_id === branchId || n.id.startsWith(`${branchId}_sub_`))
        );

        const subChildren = subBranches.map((s) => ({
          data: {
            text: s.data?.label || 'Sub Poin',
          },
          children: [],
        }));

        // Tambahkan juga jika ada sub_poin berupa array string di node b
        if (b.data?.sub_poin && Array.isArray(b.data.sub_poin)) {
          b.data.sub_poin.forEach((txt) => {
            if (!subChildren.some((sc) => sc.data.text === txt)) {
              subChildren.push({
                data: { text: txt },
                children: [],
              });
            }
          });
        }

        return {
          data: {
            text: b.data?.label || 'Cabang',
          },
          children: subChildren,
        };
      });

      treeData = {
        data: {
          text: rootText,
        },
        children: branchItems,
      };
    }

    // 2. Inisialisasi atau Update instance SimpleMindMap
    if (!mindMapInstance.current) {
      try {
        mindMapInstance.current = new MindMap({
          el: containerRef.current,
          data: treeData,
          layout: 'mindMap', // Tata letak cabang memancar dua arah khas mind map
          theme: 'dark2', // Tema gelap elegan serasi dengan palet slate aplikasi
          readonly: false, // Memungkinkan eksplorasi interaktif, drag & expand cabang
        });
      } catch (err) {
        console.error('[SimpleMindMap Error]:', err);
      }
    } else {
      try {
        mindMapInstance.current.setData(treeData);
        mindMapInstance.current.render();
      } catch (e) {
        console.warn('Gagal re-render mind map:', e);
      }
    }

    return () => {
      // Cleanup instance saat berganti tab
      if (mindMapInstance.current) {
        try {
          mindMapInstance.current.destroy();
        } catch (_) {}
        mindMapInstance.current = null;
      }
    };
  }, [nodes]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0f172a',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          backgroundColor: 'rgba(30, 41, 59, 0.85)',
          color: '#94a3b8',
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #334155',
          pointerEvents: 'none',
        }}
      >
        Engine: wanglin2/mind-map (simple-mind-map)
      </div>
    </div>
  );
};
