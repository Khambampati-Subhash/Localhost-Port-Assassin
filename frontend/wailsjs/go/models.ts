export namespace config {
	
	export class Config {
	    watched_ports: number[];
	    notifications_enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.watched_ports = source["watched_ports"];
	        this.notifications_enabled = source["notifications_enabled"];
	    }
	}

}

export namespace sys {
	
	export class PortInfo {
	    port: number;
	    pid: number;
	    process: string;
	
	    static createFrom(source: any = {}) {
	        return new PortInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.pid = source["pid"];
	        this.process = source["process"];
	    }
	}

}

