#include <iostream>
#include <napi.h>
#include <enet/enet.h>

#define NCP const Napi::CallbackInfo& info

ENetHost* host;
Napi::FunctionReference emit;
int port;
unsigned int connectID = 0;

void Finalizer(Napi::Env env, uint8_t* data) {
	delete[] data; // free created data by C++
}

void js_init(NCP) {
	
	auto env = info.Env();
	port = info[0].As<Napi::Number>().Uint32Value();
	
	if (enet_initialize())
		return Napi::Error::New(env, "ENet Failed to Initialize").ThrowAsJavaScriptException();

	std::cout << "ENet Initialized with Port: " << port << std::endl;
}

void js_set_event_emitter(NCP) {
	auto func = info[0].As<Napi::Function>();

	emit = Napi::Persistent(func);
	std::cout << "Event Emitter Set" << std::endl;
}

void js_host_create(NCP) {
	ENetAddress address;
	address.port = port;
	address.host = ENET_HOST_ANY;

	host = enet_host_create(&address,
		1024,
		2,
		0,
		0);

	// set some compression that gt uses
	host->checksum = enet_crc32;
	enet_host_compress_with_range_coder(host);

	std::cout << "ENet Host created." << std::endl;
}

void js_host_event_recieve(NCP) {
	auto env = info.Env();
	ENetEvent event;

	if (enet_host_service(host, &event, 0) > 0) {
		switch (event.type) {
			case ENET_EVENT_TYPE_CONNECT: {
				unsigned int connID = connectID++;

				// copy connectID to peer data
				event.peer->data = new uint8_t[sizeof(unsigned int)];
				memcpy(event.peer->data, &connID, sizeof(unsigned int));

				emit.Call({
					Napi::String::New(env, "connect"),
					Napi::Number::New(env, *reinterpret_cast<unsigned int*>(event.peer->data))
				});

				break;
			}

			case ENET_EVENT_TYPE_RECEIVE: {
				auto data = new uint8_t[event.packet->dataLength];
				memcpy(data, event.packet->data, event.packet->dataLength);

				auto buffer = Napi::Buffer<uint8_t>::New(env, data, event.packet->dataLength, Finalizer);
				emit.Call({
					Napi::String::New(env, "receive"),
					Napi::Number::New(env, *reinterpret_cast<unsigned int*>(event.peer->data)),
					buffer
				});

				enet_packet_destroy(event.packet);
				break;
			}

			case ENET_EVENT_TYPE_DISCONNECT: {
				emit.Call({
					Napi::String::New(env, "disconnect"),
					Napi::Number::New(env, *reinterpret_cast<unsigned int*>(event.peer->data))
				});

				delete[] event.peer->data;
				break;
			}
		}
	}
}

void js_send_packet(NCP) {
	auto buf = info[0].As<Napi::Buffer<uint8_t>>();
	auto connectID = info[1].As<Napi::Number>().Uint32Value();

	auto bytes = buf.Data();

	for (int i = 0; i < host->peerCount; ++i) {
		if (!host->peers[i].data || host->peers[i].state != ENET_PEER_STATE_CONNECTED) continue;

		ENetPacket* packet = enet_packet_create(bytes, buf.Length(), ENET_PACKET_FLAG_RELIABLE);
		enet_peer_send(&host->peers[i], 0, packet);
	}
}

void js_peer_disconnect(NCP) {
	auto type = info[0].As<Napi::Number>().Uint32Value();
	auto connectID = info[1].As<Napi::Number>().Uint32Value();

	for (int i = 0; i < host->peerCount; ++i) {
		if (!host->peers[i].data || host->peers[i].state != ENET_PEER_STATE_CONNECTED) continue;

		switch (type) {
			case 0: {
				enet_peer_disconnect(&host->peers[i], 0);
				break;
			}

			case 1: {
				enet_peer_disconnect_now(&host->peers[i], 0);
				break;
			}

			case 2: {
				enet_peer_disconnect_later(&host->peers[i], 0);
				break;
			}
		}
	}
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports["init"] = Napi::Function::New(env, js_init);
	exports["set_event_emitter"] = Napi::Function::New(env, js_set_event_emitter);
	exports["host_create"] = Napi::Function::New(env, js_host_create);
	exports["host_event_recieve"] = Napi::Function::New(env, js_host_event_recieve);
	exports["send_packet"] = Napi::Function::New(env, js_send_packet);
	exports["peer_disconnect"] = Napi::Function::New(env, js_peer_disconnect);

	return exports;
}

NODE_API_MODULE(Core, Init)