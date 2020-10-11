{
	"targets": [
		{
			"target_name": "index",
			"sources": [
				"Main.cpp"
			],
			"include_dirs": [
				"<!@(node -p \"require('node-addon-api').include\")",
				"<(module_root_dir)/include"
			],
			"defines": [
				"NAPI_DISABLE_CPP_EXCEPTIONS"
			],
			"conditions": [
				['OS=="linux"', {
						"libraries": [
							"-lenet"
						]
					}
				],
				['OS=="win"', {
						"msbuild_settings": {
							"Link": {
								"ImageHasSafeExceptionHandlers": "false"
							}
						},
						"libraries": [
							"<(module_root_dir)/lib/enet.lib",
							"winmm.lib",
							"ws2_32.lib"
						]
					}
				]
			]
		}
	]
}