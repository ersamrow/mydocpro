import ToolApplication from '../components/ToolApplication.js';
import {staticContent} from '../src/static-content.js';
export default ToolApplication;
export function getStaticProps(){return {props:{id:'404',html:staticContent('404')}};}
