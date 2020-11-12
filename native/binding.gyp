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
						"cflags_cc": ["-fPIC"],
						"libraries": [
							"<(module_root_dir)/lib/Linux/libenet.a"
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
							"<(module_root_dir)/lib/enet<!@(node -p \"process.arch === 'x64' ? '64' : ''\").lib",
							"winmm.lib",
							"ws2_32.lib"
						]
					}
				]
			]
		}
	]
}