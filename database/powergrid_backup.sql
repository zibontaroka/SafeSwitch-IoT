--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    action character varying(255) NOT NULL,
    entity character varying(50) NOT NULL,
    entity_id integer,
    performed_by character varying(100),
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    device_uid character varying(50) NOT NULL,
    status boolean DEFAULT false,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    zone_id integer
);


--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: feeder_control_handover; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feeder_control_handover (
    id integer NOT NULL,
    feeder_id integer,
    operator_id integer,
    lineman_id integer,
    control_active boolean DEFAULT true,
    handed_over_at timestamp without time zone DEFAULT now(),
    revoked_at timestamp without time zone
);


--
-- Name: feeder_control_handover_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feeder_control_handover_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feeder_control_handover_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feeder_control_handover_id_seq OWNED BY public.feeder_control_handover.id;


--
-- Name: feeder_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feeder_zones (
    feeder_id integer NOT NULL,
    zone_id integer NOT NULL
);


--
-- Name: feeders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feeders (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    status boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feeders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feeders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feeders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feeders_id_seq OWNED BY public.feeders.id;


--
-- Name: logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    user_id integer,
    zone_id integer,
    action text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: relays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relays (
    id integer NOT NULL,
    relay_uid character varying(100) NOT NULL,
    device_uid character varying(50) NOT NULL,
    gpio_pin integer NOT NULL,
    relay_status boolean DEFAULT false,
    zone_id integer,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    feeder_id integer
);


--
-- Name: relays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relays_id_seq OWNED BY public.relays.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id integer NOT NULL,
    manager_id integer NOT NULL,
    target_user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    changes text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    is_2fa_enabled boolean DEFAULT false,
    otp_code character varying(255),
    otp_expires_at timestamp without time zone,
    phone character varying(15),
    role_id integer,
    is_active boolean DEFAULT true,
    full_name character varying(150),
    pin_hash text,
    theme_mode character varying(10) DEFAULT 'light'::character varying
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: zone_control_handover; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zone_control_handover (
    id integer NOT NULL,
    zone_id integer NOT NULL,
    operator_id integer NOT NULL,
    lineman_id integer NOT NULL,
    control_active boolean DEFAULT true,
    handed_over_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    feeder_id integer
);


--
-- Name: zone_control_handover_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zone_control_handover_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zone_control_handover_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zone_control_handover_id_seq OWNED BY public.zone_control_handover.id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    last_seen timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zones_id_seq OWNED BY public.zones.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: feeder_control_handover id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_control_handover ALTER COLUMN id SET DEFAULT nextval('public.feeder_control_handover_id_seq'::regclass);


--
-- Name: feeders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeders ALTER COLUMN id SET DEFAULT nextval('public.feeders_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: relays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relays ALTER COLUMN id SET DEFAULT nextval('public.relays_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: zone_control_handover id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover ALTER COLUMN id SET DEFAULT nextval('public.zone_control_handover_id_seq'::regclass);


--
-- Name: zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones ALTER COLUMN id SET DEFAULT nextval('public.zones_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, action, entity, entity_id, performed_by, description, created_at) FROM stdin;
1	CREATE	user	8	2	User zibon11 created by Manager zibon	2025-07-10 23:58:09.827169
2	CREATE	user	9	2	User zibon2 created by Manager zibon	2025-07-11 00:19:51.47249
3	DEACTIVATE	user	9	2	User zibon2 deactivated by Manager zibon	2025-07-11 00:28:06.622273
4	DEACTIVATE	user	9	2	User zibon2 deactivated by Manager zibon	2025-07-11 00:28:18.834824
5	DEACTIVATE	user	6	2	User operator1 deactivated by Manager zibon	2025-07-11 00:28:24.701017
6	DEACTIVATE	user	6	2	User operator1 deactivated by Manager zibon	2025-07-11 00:34:10.041273
7	DEACTIVATE	user	7	2	User lineman1 deactivated by Manager zibon	2025-07-11 00:34:17.727959
8	DEACTIVATE	user	9	2	User zibon2 deactivated by Manager zibon	2025-07-11 00:35:01.819594
9	DEACTIVATE	user	8	2	User zibon11 deactivated by Manager zibon	2025-07-11 00:35:04.495753
10	DEACTIVATE	user	8	2	User zibon11 deactivated by Manager zibon	2025-07-11 00:35:06.679353
11	DEACTIVATE	user	7	2	User lineman1 deactivated by Manager zibon	2025-07-11 00:35:10.87739
12	UPDATE	user	9	2	User zibon2 updated by Manager zibon	2025-07-11 00:57:20.432092
13	UPDATE	user	8	2	User zibon11 updated by Manager zibon	2025-07-11 00:57:42.992103
14	UPDATE	user	7	2	User Ibrahim mahmud updated by Manager zibon	2025-07-11 00:58:39.965681
15	UPDATE	user	9	2	User zibon2 updated by Manager zibon	2025-07-11 01:22:43.078596
16	UPDATE	user	8	2	User zibon11 updated by Manager zibon	2025-07-11 13:12:08.499349
17	CREATE	user	10	2	User zibon4 created by Manager zibon	2025-07-11 13:25:19.130082
18	CREATE	user	11	2	User zibon22 created by Manager zibon	2025-07-11 13:34:55.721404
19	UPDATE	user	8	2	User zibon3 updated by Manager zibon	2025-07-11 21:09:54.417711
20	UPDATE	user	8	2	User zibon3 updated by Manager zibon	2025-07-11 21:11:11.399248
21	UPDATE	user	8	2	User zibon33 updated by Manager zibon	2025-07-11 21:12:25.535475
22	CREATE	user	12	2	User zibon3 created by Manager zibon	2025-07-11 21:13:34.276892
23	UPDATE	user	1	2	User taskin updated by Manager zibon	2025-07-15 12:02:57.129116
24	UPDATE	user	1	2	User taskin updated by Manager zibon	2025-07-15 12:16:11.963569
25	UPDATE	user	10	2	User zibon4 updated by Manager zibon	2025-07-15 12:17:29.241156
26	UPDATE	user	1	2	User taskin updated by Manager zibon	2025-07-15 12:36:58.612098
27	UPDATE	user	10	2	User zibon4 updated by Manager zibon	2025-07-15 12:37:15.095919
28	UPDATE	user	1	2	User taskin updated by Manager zibon	2025-07-15 12:39:11.698304
29	CREATE	user	13	2	User Tonmoy created by Manager zibon	2025-07-15 16:42:07.910117
30	UPDATE	user	8	2	User zibon33 updated by Manager zibon	2025-07-15 16:45:55.200914
31	UPDATE	user	8	2	User zibon3 updated by Manager zibon	2025-07-15 16:46:02.363582
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.devices (id, device_uid, status, last_seen, created_at, updated_at, zone_id) FROM stdin;
1	CA-D-456A	f	2025-07-23 19:58:10.538923+06	2025-07-05 18:38:14.472386+06	2025-07-23 19:58:10.538923+06	\N
\.


--
-- Data for Name: feeder_control_handover; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feeder_control_handover (id, feeder_id, operator_id, lineman_id, control_active, handed_over_at, revoked_at) FROM stdin;
10	19	9	8	f	2025-07-14 18:03:39.933392	\N
\.


--
-- Data for Name: feeder_zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feeder_zones (feeder_id, zone_id) FROM stdin;
19	45
17	45
17	52
18	45
18	50
\.


--
-- Data for Name: feeders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feeders (id, name, status, updated_at) FROM stdin;
18	Feeder-1	f	2025-07-23 17:32:47.619692
19	Feeder-2	f	2025-07-23 17:32:48.564234
20	Feeder-4	f	2025-07-23 17:32:49.116399
17	Feeder-5	f	2025-07-23 17:32:49.564967
15	FEEDER5	f	2025-07-23 17:32:50.012356
\.


--
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.logs (id, user_id, zone_id, action, "timestamp") FROM stdin;
\.


--
-- Data for Name: relays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.relays (id, relay_uid, device_uid, gpio_pin, relay_status, zone_id, updated_at, created_at, feeder_id) FROM stdin;
5	CA-D-456A-7	CA-D-456A	15	f	53	2025-07-23 19:52:49.671552+06	2025-07-06 00:36:11.896297+06	\N
6	CA-D-456A-5	CA-D-456A	12	f	45	2025-07-23 19:52:49.671504+06	2025-07-06 00:36:11.918639+06	\N
4	CA-D-456A-6	CA-D-456A	13	f	51	2025-07-23 19:52:49.671525+06	2025-07-06 00:36:11.833813+06	\N
2	CA-D-456A-3	CA-D-456A	16	f	52	2025-07-23 19:52:49.670783+06	2025-07-06 00:36:11.718025+06	\N
1	CA-D-456A-1	CA-D-456A	4	f	54	2025-07-23 19:52:49.670666+06	2025-07-06 00:36:11.627817+06	\N
7	CA-D-456A-4	CA-D-456A	14	f	50	2025-07-23 19:52:49.67113+06	2025-07-06 00:36:11.973111+06	\N
3	CA-D-456A-2	CA-D-456A	5	f	54	2025-07-23 19:52:49.670714+06	2025-07-06 00:36:11.817796+06	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, role_name) FROM stdin;
2	Operator
4	Viewer
1	Manager
3	Lineman
\.


--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_activity_logs (id, manager_id, target_user_id, action, changes, "timestamp") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, email, is_2fa_enabled, otp_code, otp_expires_at, phone, role_id, is_active, full_name, pin_hash, theme_mode) FROM stdin;
8	zibon3	$2b$10$/c/y66K6XHNT3mRSihim.urYR60t6J5qRykb0SaenT3WR5W3ehgtq	zibont@gmail.com	f	\N	\N	01788045013	3	t	Md Shaifulla Zibon	$2b$10$V2IWWzUv8Ah4QsISub/V0.zNsGCNEZAmul4pcINFQhB.wFPGCur6q	light
9	zibon2	$2b$10$H384UCEvVuSE4QOBuK4dzeDU7/D73ibEBi9w2IMpQrgPHbBDQnCcW	zibont1@gmail.com	f	\N	\N	01788045017	2	t	Md Shaifulla Zibon	\N	dark
13	Tonmoy	$2b$10$QDw61ldlfl4rFl/A9i2xfO4aA8cLUTcrMhpiP.mzI2aNY4O7pomqa	tonmoy@power.com	f	\N	\N	01788045099	4	t	MH Tonmoy 	\N	light
2	zibon	$2b$10$0fdGGwtDiCp1//59Cqy04uZ4Nyis/aG3my6fEMaNJ7BbN85L.c5GS	zibont99@gmail.com	f	\N	\N	\N	1	t	\N	\N	light
\.


--
-- Data for Name: zone_control_handover; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zone_control_handover (id, zone_id, operator_id, lineman_id, control_active, handed_over_at, revoked_at, feeder_id) FROM stdin;
32	50	9	8	f	2025-07-15 15:20:23.788161+06	\N	\N
38	45	9	8	f	2025-07-15 19:16:16.607515+06	\N	\N
37	50	9	8	f	2025-07-15 17:54:42.832043+06	\N	\N
39	45	9	8	f	2025-07-23 13:50:02.673555+06	\N	\N
40	54	9	8	f	2025-07-23 19:44:42.577346+06	\N	\N
41	54	9	8	f	2025-07-23 19:49:32.2969+06	\N	\N
24	45	9	8	f	2025-07-14 18:03:49.835451+06	\N	\N
25	45	9	8	f	2025-07-15 13:24:13.203718+06	\N	\N
30	45	9	8	f	2025-07-15 15:19:12.585043+06	\N	\N
33	51	9	8	f	2025-07-15 15:20:25.905819+06	\N	\N
34	52	9	8	f	2025-07-15 15:20:28.306276+06	\N	\N
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zones (id, name, status, last_seen, updated_at) FROM stdin;
53	Mirpur-6	t	\N	2025-07-23 19:49:15.536574
52	Mirpur-5	t	\N	2025-07-23 19:49:16.186213
51	Mirpur-4	t	\N	2025-07-23 19:49:16.520859
50	Mirpur-3	t	\N	2025-07-23 19:49:16.984431
45	Gabtoli-2	t	\N	2025-07-23 19:49:23.312329
54	Mirpur-10	t	\N	2025-07-23 19:50:23.074204
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 31, true);


--
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.devices_id_seq', 2, true);


--
-- Name: feeder_control_handover_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.feeder_control_handover_id_seq', 10, true);


--
-- Name: feeders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.feeders_id_seq', 20, true);


--
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- Name: relays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.relays_id_seq', 1153, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_activity_logs_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 13, true);


--
-- Name: zone_control_handover_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zone_control_handover_id_seq', 41, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zones_id_seq', 55, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: devices devices_device_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_device_uid_key UNIQUE (device_uid);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: feeder_control_handover feeder_control_handover_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_control_handover
    ADD CONSTRAINT feeder_control_handover_pkey PRIMARY KEY (id);


--
-- Name: feeder_zones feeder_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_zones
    ADD CONSTRAINT feeder_zones_pkey PRIMARY KEY (feeder_id, zone_id);


--
-- Name: feeders feeders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeders
    ADD CONSTRAINT feeders_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: relays relays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relays
    ADD CONSTRAINT relays_pkey PRIMARY KEY (id);


--
-- Name: relays relays_relay_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relays
    ADD CONSTRAINT relays_relay_uid_key UNIQUE (relay_uid);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: feeders unique_feeder_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeders
    ADD CONSTRAINT unique_feeder_name UNIQUE (name);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: zone_control_handover zone_control_handover_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover
    ADD CONSTRAINT zone_control_handover_pkey PRIMARY KEY (id);


--
-- Name: zones zones_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_name_key UNIQUE (name);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: idx_device_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_uid ON public.devices USING btree (device_uid);


--
-- Name: idx_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_entity ON public.activity_logs USING btree (entity);


--
-- Name: devices update_devices_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_devices_timestamp BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: zones update_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: devices devices_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: feeder_control_handover feeder_control_handover_feeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_control_handover
    ADD CONSTRAINT feeder_control_handover_feeder_id_fkey FOREIGN KEY (feeder_id) REFERENCES public.feeders(id) ON DELETE CASCADE;


--
-- Name: feeder_control_handover feeder_control_handover_lineman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_control_handover
    ADD CONSTRAINT feeder_control_handover_lineman_id_fkey FOREIGN KEY (lineman_id) REFERENCES public.users(id);


--
-- Name: feeder_control_handover feeder_control_handover_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_control_handover
    ADD CONSTRAINT feeder_control_handover_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: feeder_zones feeder_zones_feeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_zones
    ADD CONSTRAINT feeder_zones_feeder_id_fkey FOREIGN KEY (feeder_id) REFERENCES public.feeders(id) ON DELETE CASCADE;


--
-- Name: feeder_zones feeder_zones_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feeder_zones
    ADD CONSTRAINT feeder_zones_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: zone_control_handover fk_feeder; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover
    ADD CONSTRAINT fk_feeder FOREIGN KEY (feeder_id) REFERENCES public.feeders(id) ON DELETE SET NULL;


--
-- Name: logs logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: relays relays_feeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relays
    ADD CONSTRAINT relays_feeder_id_fkey FOREIGN KEY (feeder_id) REFERENCES public.feeders(id);


--
-- Name: user_activity_logs user_activity_logs_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_activity_logs user_activity_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: zone_control_handover zone_control_handover_lineman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover
    ADD CONSTRAINT zone_control_handover_lineman_id_fkey FOREIGN KEY (lineman_id) REFERENCES public.users(id);


--
-- Name: zone_control_handover zone_control_handover_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover
    ADD CONSTRAINT zone_control_handover_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: zone_control_handover zone_control_handover_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_control_handover
    ADD CONSTRAINT zone_control_handover_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- PostgreSQL database dump complete
--

