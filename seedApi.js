const API_URL = "http://localhost:8000";

async function seedData() {
    console.log("Fetching classes...");
    const classRes = await fetch(`${API_URL}/api/erp/classes`);
    const classData = await classRes.json();
    
    if (!classData.success || classData.classes.length === 0) {
        console.error("No classes found. Cannot seed students.");
        return;
    }
    
    const classes = classData.classes;

    console.log("Seeding 5 Teachers...");
    for (let i = 1; i <= 5; i++) {
        const teacherData = {
            phone: `98700000${i.toString().padStart(2, '0')}`,
            name: `Dummy Teacher ${i}`,
            email: `teacher${i}@greenview.edu.in`,
            subject: i % 2 === 0 ? "Mathematics" : "Science",
            qualification: "M.Sc, B.Ed",
            department: "Academics",
            employeeId: `TCH-${i.toString().padStart(3, '0')}`,
            accessRole: "Teacher",
            password: "password123"
        };

        const res = await fetch(`${API_URL}/api/erp/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teacherData)
        });
        const data = await res.json();
        console.log(`Teacher ${i}:`, data.message || data.error);
    }

    console.log("Seeding 10 Students...");
    for (let i = 1; i <= 10; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        const sections = randomClass.sections && randomClass.sections.length > 0 ? randomClass.sections : ['A'];
        const randomSection = sections[Math.floor(Math.random() * sections.length)];

        const studentData = {
            studentName: `Dummy Student ${i}`,
            classId: randomClass._id,
            section: randomSection,
            fatherName: `Father of Student ${i}`,
            fatherMobile: `99700000${i.toString().padStart(2, '0')}`,
            motherName: `Mother of Student ${i}`,
            dob: "2010-05-15",
            sex: i % 2 === 0 ? "Male" : "Female",
            religion: "Hindu",
            socialCategory: "General",
            address: `House ${i}, Green View Street`,
            admissionMonthIndex: 0
        };

        const res = await fetch(`${API_URL}/api/erp/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        const data = await res.json();
        console.log(`Student ${i}:`, data.message || data.error);
    }

    console.log("Seeding finished!");
}

seedData().catch(console.error);
