import ToolApplication from '../components/ToolApplication.js';
import {routeIds,staticContent} from '../src/static-content.js';
export default ToolApplication;
export function getStaticPaths(){return {paths:routeIds.map(id=>({params:{slug:id?[id]:[]}})),fallback:false};}
export function getStaticProps({params}){const id=(params.slug||[]).join('/');return {props:{id,html:staticContent(id)}};}
