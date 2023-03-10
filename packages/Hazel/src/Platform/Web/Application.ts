import { Application as _Application } from "../../Hazel/Application";
import { Input as _Input } from "../../Hazel/Input";
import { Window } from "./Window";
import { Loop } from "./Loop";
import { WindowCloseEvent } from "../../Hazel/Events/ApplicationEvent";
import { Event, EventDispatcher } from "../../Hazel/Events/Event";
import { Input } from "./Input";
import { ImGuiLayer } from "../../Hazel/ImGui";
import { gl } from "../WebGL2/WebGL2Context";
import vertexSrc from "../WebGL2/shader/vertex.vert";
import fragmentSrc from "../WebGL2/shader/fragment.frag";
import { Shader } from "../WebGL2/Shader";

export class Application extends _Application {
    container: HTMLElement;
    m_Input: _Input;
    m_ImGuiLayer: ImGuiLayer;
    m_Shader: Shader;

    constructor(el: HTMLElement) {
        super();
        this.m_Loop = Loop.create();

        this.container = el;
        const rect = this.containerRect();

        this.m_Window = Window.create({
            el,
            title: "Hazel",
            width: rect.width,
            height: rect.height,
        });
        this.m_Window.setEventCallback(this.onEvent.bind(this));
        this.m_Input = Input.create();
        this.m_ImGuiLayer = new ImGuiLayer();
        this.m_ImGuiLayer.setContext(gl);
        this.pushOverlay(this.m_ImGuiLayer);

        this.m_Shader = new Shader(vertexSrc, fragmentSrc);
        this.m_Shader.bind();

        // gl.useProgram(program);
        // const a_Position = gl.getAttribLocation(program, 'a_Position');
        gl.enableVertexAttribArray(0);

        const arrayBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * 4, 0);

        const vertices = new Float32Array([
            -0.5,
            -0.5,
            0, // point1
            0.5,
            -0.5,
            0, // point2
            0,
            0.5,
            0, // point3
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const m_indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m_indexBuffer);

        const indices = new Uint16Array([0, 1, 2]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    containerRect() {
        return this.container.getBoundingClientRect();
    }

    run(): void {
        console.info("Application running...");

        this.m_Loop.while(() => {
            gl.clearColor(0.1, 0.1, 0.1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            this.m_Shader.bind();
            // gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);

            for (const layer of this.m_LayerStack) {
                layer.onUpdate();
            }

            this.m_ImGuiLayer.begin();
            for (const layer of this.m_LayerStack) {
                if ("onImGuiRender" in (layer as ImGuiLayer)) {
                    (layer as ImGuiLayer).onImGuiRender();
                }
            }
            this.m_ImGuiLayer.end();

            this.m_Window.onUpdate();
        });
    }

    onEvent(event: Event): void {
        const dispatcher = new EventDispatcher(event);
        dispatcher.dispatch(WindowCloseEvent, this.onWindowClose.bind(this));

        for (const layer of this.m_LayerStack) {
            layer.onEvent(event);
            if (event.m_Handled) {
                break;
            }
        }
    }

    protected onWindowClose() {
        this.m_running = false;
        this.m_Loop.stop();
        return true;
    }

    static createApplication(el: HTMLElement = document.body): _Application {
        return new Application(el);
    }
}
