<template>
  <div class="knowledge-graph-wrapper" :class="{ 'full-screen': isFullScreen }">
    <div class="graph-header" v-if="!isFullScreen">
      <h3>Your Learning Constellation</h3>
      <p>Click a node to explore your knowledge connections</p>
      <button class="btn btn-primary btn-sm expand-btn" @click="$emit('expand')">
        ⛶ View Full Garden
      </button>
    </div>

    <div class="svg-container" ref="containerRef">
      <svg class="graph-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet"
           @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
        <!-- Define Gradients & Filters -->
        <defs>
          <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(0, 51, 102, 0.4)" />
            <stop offset="100%" stop-color="rgba(204, 0, 0, 0.4)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <line 
          v-for="(link, i) in links" :key="'link-'+i"
          :x1="getNode(link.source).x" :y1="getNode(link.source).y"
          :x2="getNode(link.target).x" :y2="getNode(link.target).y"
          class="edge"
          :class="{ 'edge-active': activeNode !== null && (link.source === nodes[activeNode]?.id || link.target === nodes[activeNode]?.id) }"
        />

        <g 
          v-for="(node, i) in nodes" :key="'node-'+i"
          class="node-group"
          :class="{ 'node-active': activeNode === i, [node.status]: true }"
          @mousedown.prevent="startDrag($event, i)"
          @touchstart.prevent="startDrag($event, i)"
          @touchmove.prevent="onTouchDrag"
          @touchend="stopDrag"
          :transform="`translate(${node.x}, ${node.y})`"
        >
          <circle v-if="node.status === 'in-progress' || activeNode === i" 
                  class="node-aura" r="35" />
          <circle class="node-circle" r="24" />
          <text class="node-icon" y="6">{{ node.icon }}</text>
          <rect class="label-bg" x="-45" y="32" width="90" height="20" rx="10" />
          <text class="node-label" y="45">{{ node.label }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps({
  isFullScreen: { type: Boolean, default: false }
})

const emit = defineEmits(['expand', 'node-selected', 'nodes-updated'])

const auth = useAuthStore()
const activeNode = ref(null)
const containerRef = ref(null)
const draggedNode = ref(null)
const isDragging = ref(false)

const nodes = ref([])
const links = ref([])

function getNode(id) {
  return nodes.value.find(n => n.id === id) || { x: 0, y: 0 }
}

function initGraph() {
  const userEmail = auth.user?.email || 'default'
  const savedNodes = localStorage.getItem(`garden_nodes_${userEmail}`)
  const savedLinks = localStorage.getItem(`garden_links_${userEmail}`)
  
  if (savedNodes) {
    nodes.value = JSON.parse(savedNodes)
    links.value = savedLinks ? JSON.parse(savedLinks) : []
  } else {
    if (auth.isStudent) {
      nodes.value = [
        { id: 0, label: 'Foundations', icon: '🧠', status: 'completed', x: 400, y: 250 },
        { id: 1, label: 'AI Ethics', icon: '⚖️', status: 'completed', x: 280, y: 150 },
        { id: 2, label: 'Data Vis', icon: '📊', status: 'in-progress', x: 550, y: 180 }
      ]
      links.value = [{ source: 0, target: 1 }, { source: 0, target: 2 }]
    } else {
      nodes.value = [
        { id: 0, label: 'Syllabus Gen', icon: '📄', status: 'completed', x: 300, y: 250 },
        { id: 1, label: 'AI Rubrics', icon: '📝', status: 'in-progress', x: 500, y: 250 }
      ]
      links.value = [{ source: 0, target: 1 }]
    }
    saveGraph()
  }
}

function saveGraph() {
  const userEmail = auth.user?.email || 'default'
  localStorage.setItem(`garden_nodes_${userEmail}`, JSON.stringify(nodes.value))
  localStorage.setItem(`garden_links_${userEmail}`, JSON.stringify(links.value))
  emit('nodes-updated', nodes.value)
}

function addNewNode(label = 'New Skill', icon = '✨') {
  const newId = nodes.value.length ? Math.max(...nodes.value.map(n => n.id)) + 1 : 0
  
  let startX = 400 + (Math.random() * 80 - 40)
  let startY = 250 + (Math.random() * 80 - 40)
  
  if (activeNode.value !== null && nodes.value[activeNode.value]) {
    startX = nodes.value[activeNode.value].x + 100
    startY = nodes.value[activeNode.value].y + (Math.random() * 40 - 20)
    links.value.push({ source: nodes.value[activeNode.value].id, target: newId })
  }

  nodes.value.push({
    id: newId,
    label: label,
    icon: icon,
    status: 'in-progress',
    x: startX,
    y: startY
  })
  
  activeNode.value = nodes.value.length - 1
  saveGraph()
}

function deleteActiveNode() {
  if (activeNode.value !== null) {
    const deletedId = nodes.value[activeNode.value].id
    nodes.value.splice(activeNode.value, 1)
    links.value = links.value.filter(l => l.source !== deletedId && l.target !== deletedId)
    activeNode.value = null
    saveGraph()
  }
}

function startDrag(evt, index) {
  draggedNode.value = index
  isDragging.value = false
  activeNode.value = index
}

function onDrag(evt) {
  if (draggedNode.value !== null && containerRef.value) {
    isDragging.value = true
    const svg = containerRef.value.querySelector('svg')
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    nodes.value[draggedNode.value].x = svgP.x
    nodes.value[draggedNode.value].y = svgP.y
  }
}

function onTouchDrag(evt) {
  if (evt.touches.length > 0) onDrag(evt.touches[0])
}

function stopDrag() {
  if (draggedNode.value !== null) {
    saveGraph()
    if (!isDragging.value || isDragging.value) {
      emit('node-selected', nodes.value[draggedNode.value])
    }
    draggedNode.value = null
    isDragging.value = false
  }
}

onMounted(() => {
  initGraph()
})

defineExpose({ addNewNode, deleteActiveNode, saveGraph, nodes })
</script>

<style scoped>
.knowledge-graph-wrapper {
  background: #ffffff; border-radius: 16px; padding: 1.5rem; 
  border: 1px solid #e0e4e8; box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  position: relative; overflow: hidden;
}

.graph-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 1rem; position: relative; z-index: 10; }
.graph-header h3 { font-size: 20px; font-weight: 700; color: #003366; }
.graph-header p { color: #6b7280; font-size: 14px; margin-top: 4px; margin-bottom: 1rem;}
.expand-btn { position: absolute; right: 0; top: 0; }

.svg-container {
  width: 100%; aspect-ratio: 16 / 9; background: radial-gradient(circle at center, #f8fafc, #eef2f6);
  border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,51,102,0.1);
}

.graph-svg { width: 100%; height: 100%; }

/* Edges */
.edge { stroke: #cbd5e1; stroke-width: 2; transition: all 0.4s ease; stroke-dasharray: 4 4; animation: dash 20s linear infinite; }
.edge-active { stroke: url(#linkGrad); stroke-width: 4; stroke-dasharray: none; filter: drop-shadow(0 0 4px rgba(204,0,0,0.4)); animation: none; }

@keyframes dash { to { stroke-dashoffset: 1000; } }

/* Nodes */
.node-group { cursor: pointer; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.node-group:hover { transform: scale(1.1) !important; }
.node-group { transform-origin: center; transform-box: fill-box; }

.node-circle { fill: white; stroke: #e0e4e8; stroke-width: 3; transition: all 0.3s; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
.node-icon { text-anchor: middle; font-size: 20px; pointer-events: none; }

/* Status styling */
.node-group.completed .node-circle { stroke: #10b981; fill: #ecfdf5; }
.node-group.in-progress .node-circle { stroke: #3b82f6; fill: #eff6ff; }
.node-group.locked .node-circle { stroke: #cbd5e1; fill: #f8fafc; filter: grayscale(1); }

/* Aura for active/in-progress */
.node-aura { fill: rgba(59, 130, 246, 0.2); animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1); pointer-events: none; }
@keyframes pulse { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }

/* Labels */
.label-bg { fill: rgba(255,255,255,0.9); rx: 10; ry: 10; }
.node-label { text-anchor: middle; font-size: 11px; font-weight: 700; fill: #334155; pointer-events: none; letter-spacing: 0.02em; }

/* Active state overrides */
.node-active .node-circle { stroke: #cc0000; stroke-width: 4; fill: #fff5f5; filter: url(#glow); }
.node-active .node-label { fill: #cc0000; }

/* Full screen overrides */
.full-screen { height: 100%; border-radius: 0; border: none; box-shadow: none; display: flex; flex-direction: column; padding: 0; }
.full-screen .svg-container { flex: 1; border-radius: 0; border: none; }
</style>
