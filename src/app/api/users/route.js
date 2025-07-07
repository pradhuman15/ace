export async function GET(request) {

    const users = [
        { 
            id: 1,
            name: "Virendra Sehwag" ,
            email: "virendra.sehwag@gmail.com",
            accessRoles: [
                { organization: 1, role: "admin" },
            ],
            active: true,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
        { 
            id: 2,
            name: "Sachin Tendulkar" ,
            email: "sachin.tendulkar@gmail.com",
            accessRoles: [
                { organization: 1, partner: 1, role: "editor" },
                { organization: 1, partner: 2, role: "editor" },
            ],
            active: true,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
        { 
            id: 3,
            name: "Rahul Dravid" ,
            email: "rahul.dravid@gmail.com",
            accessRoles: [
                { organization: 1, partner: 1, advertiser: 1, role: "editor"},
                { organization: 1, partner: 1, advertiser: 9, role: "viewer" },
            ],
            active: true,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
        { 
            id: 4,
            name: "Anil Kumble" ,
            email: "anil.kumble@gmail.com",
            accessRoles: [
                { organization: 1, role: "editor" },
            ],
            active: false,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
        { 
            id: 5,
            name: "Yuvraj Singh" ,
            email: "yuvraj.singh@gmail.com",
            accessRoles: [
                { organization: 1, partner: 2, role: "viewer" },
                { organization: 1, partner: 3, role: "editor" },
            ],
            active: true,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
        { 
            id: 6,
            name: "Mahendra Singh Dhoni" ,
            email: "mahendra.singh.dhoni@gmail.com",
            accessRoles: [
                { organization: 1, partner: 3, advertiser: 22, role: "viewer" },
                { organization: 1, partner: 3, advertiser: 27, role: "viewer" },
                { organization: 1, partner: 3, advertiser: 23, role: "viewer" },
                { organization: 1, partner: 3, advertiser: 29, role: "viewer" },
                { organization: 1, partner: 4, advertiser: 32, role: "editor" },
                { organization: 1, partner: 4, advertiser: 37, role: "editor" },
                { organization: 1, partner: 4, advertiser: 33, role: "editor" },
                { organization: 1, partner: 4, advertiser: 39, role: "editor" },
            ],
            active: true,
            creationTs: new Date().getTime(),
            lastLoginTs: new Date().getTime(),
        },
    ]

    return new Response(
        JSON.stringify(users),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )
}

